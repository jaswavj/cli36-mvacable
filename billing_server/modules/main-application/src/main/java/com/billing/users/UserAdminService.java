package com.billing.users;

import com.billing.data.AppUser;
import com.billing.users.dto.AttenderData;
import com.billing.users.dto.AttenderSaveRequest;
import com.billing.users.dto.ChangePasswordRequest;
import com.billing.users.dto.CreateUserRequest;
import com.billing.users.dto.DiscountUpdateRequest;
import com.billing.users.dto.ModuleData;
import com.billing.users.dto.OutletData;
import com.billing.users.dto.PermissionUpdateRequest;
import com.billing.users.dto.UserDiscountData;
import com.billing.users.dto.UserOptionData;
import com.billing.users.dto.UserPermissionsData;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public List<ModuleData> modules() {
        return jdbcTemplate.query(
                "SELECT id, module_name FROM user_modules ORDER BY id",
                (rs, i) -> {
                    ModuleData row = new ModuleData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("module_name"));
                    return row;
                }
        );
    }

    public List<OutletData> outlets() {
        return jdbcTemplate.query(
                "SELECT shop_id, shop_name FROM outlets ORDER BY shop_name",
                (rs, i) -> {
                    OutletData row = new OutletData();
                    row.setShopId(rs.getString("shop_id"));
                    row.setShopName(rs.getString("shop_name"));
                    return row;
                }
        );
    }

    public List<UserOptionData> users() {
        return users(null);
    }

    public List<UserOptionData> users(String shopId) {
        return users(shopId, false);
    }

    public List<UserOptionData> users(String shopId, boolean blocked) {
        int active = blocked ? 0 : 1;
        StringBuilder sql = new StringBuilder(
                "SELECT u.id, u.user_name, IFNULL(u.fullName,'') AS fullName, u.shop_id AS shopId, " +
                        "IFNULL(o.shop_name, u.shop_id) AS shopName " +
                        "FROM users u LEFT JOIN outlets o ON o.shop_id = u.shop_id " +
                        "WHERE IFNULL(u.is_active,0) = ?"
        );
        List<Object> args = new java.util.ArrayList<>();
        args.add(active);
        if (shopId != null && !shopId.isBlank()) {
            sql.append(" AND u.shop_id = ?");
            args.add(shopId);
        }
        sql.append(" ORDER BY fullName, u.user_name");
        return jdbcTemplate.query(sql.toString(), (rs, i) -> {
            UserOptionData row = mapUserOption(rs.getLong("id"), rs.getString("user_name"), rs.getString("fullName"));
            row.setShopId(rs.getString("shopId"));
            row.setShopName(rs.getString("shopName"));
            return row;
        }, args.toArray());
    }

    @Transactional
    public void setUserActive(Long userId, boolean active, Long actorId) {
        requireUser(userId);
        if (!active && actorId != null && actorId.equals(userId)) {
            throw new RuntimeException("You cannot block your own login");
        }
        int updated = jdbcTemplate.update("UPDATE users SET is_active = ? WHERE id = ?", active ? 1 : 0, userId);
        if (updated == 0) {
            throw new RuntimeException("User not found");
        }
    }

    @Transactional
    public void createUser(CreateUserRequest request, AppUser actor) {
        String fullName = required(request.getFullName(), "Full name is required");
        String userName = required(request.getUserName(), "Username is required");
        String password = required(request.getPassword(), "Password is required");
        String shopId = actor == null ? "" : actor.shopId();
        if (shopId == null || shopId.isBlank()) {
            shopId = jdbcTemplate.query(
                    "SELECT shop_id FROM users WHERE shop_id IS NOT NULL AND shop_id <> '' ORDER BY id LIMIT 1",
                    rs -> rs.next() ? rs.getString(1) : ""
            );
        }
        if (shopId == null || shopId.isBlank()) {
            throw new RuntimeException("Shop is not configured. Login again and try.");
        }
        final String saveShopId = shopId;
        Integer existing = jdbcTemplate.query(
                "SELECT id FROM users WHERE user_name = ?",
                rs -> rs.next() ? rs.getInt(1) : 0,
                userName
        );
        if (existing != null && existing > 0) {
            throw new RuntimeException("Username already exists!");
        }
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO users(user_name, password, is_active, fullName, shop_id, is_admin) VALUES (?, ?, 1, ?, ?, 0)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, userName);
            ps.setString(2, passwordEncoder.encode(password));
            ps.setString(3, fullName);
            ps.setString(4, saveShopId);
            return ps;
        }, keys);
        Number key = keys.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to create user");
        }
        long uid = key.longValue();
        saveModulePermissions(uid, request.getModuleIds());
    }

    public UserPermissionsData modulePermissions(Long userId) {
        UserPermissionsData data = new UserPermissionsData();
        data.setUserId(userId);
        data.setName(userDisplayName(userId));
        data.setAll(modules());
        data.setSelectedIds(jdbcTemplate.query(
                "SELECT module_id FROM user_permission WHERE uid = ?",
                (rs, i) -> rs.getLong(1),
                userId
        ));
        return data;
    }

    @Transactional
    public void updateModulePermissions(Long userId, PermissionUpdateRequest request) {
        requireUser(userId);
        jdbcTemplate.update("DELETE FROM user_permission WHERE uid = ?", userId);
        saveModulePermissions(userId, request == null ? null : request.getIds());
    }

    public UserPermissionsData specialPermissions(Long userId) {
        UserPermissionsData data = new UserPermissionsData();
        data.setUserId(userId);
        data.setName(userDisplayName(userId));
        data.setAll(jdbcTemplate.query(
                "SELECT id, content FROM special_permission ORDER BY id",
                (rs, i) -> {
                    ModuleData row = new ModuleData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("content"));
                    return row;
                }
        ));
        data.setSelectedIds(jdbcTemplate.query(
                "SELECT content_id FROM user_special_permission WHERE user_id = ?",
                (rs, i) -> rs.getLong(1),
                userId
        ));
        return data;
    }

    @Transactional
    public void updateSpecialPermissions(Long userId, PermissionUpdateRequest request) {
        requireUser(userId);
        jdbcTemplate.update("DELETE FROM user_special_permission WHERE user_id = ?", userId);
        List<Long> ids = request == null || request.getIds() == null ? List.of() : request.getIds();
        for (Long permissionId : ids) {
            if (permissionId == null) {
                continue;
            }
            jdbcTemplate.update(
                    "INSERT INTO user_special_permission (content_id, user_id) VALUES (?, ?)",
                    permissionId, userId
            );
        }
    }

    public List<AttenderData> attenders() {
        return jdbcTemplate.query(
                "SELECT id, name, code, is_active FROM attender ORDER BY name",
                (rs, i) -> {
                    AttenderData row = new AttenderData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setCode(rs.getString("code") == null ? "" : rs.getString("code"));
                    row.setIsActive(rs.getInt("is_active"));
                    return row;
                }
        );
    }

    @Transactional
    public void saveAttender(AttenderSaveRequest request) {
        String name = required(request.getName(), "Name is required");
        String code = request.getCode() == null ? "" : request.getCode().trim();
        if (request.getId() != null && request.getId() > 0) {
            int updated = jdbcTemplate.update(
                    "UPDATE attender SET name = ?, code = ? WHERE id = ?",
                    name, code, request.getId()
            );
            if (updated == 0) {
                throw new RuntimeException("Attender not found");
            }
        } else {
            jdbcTemplate.update("INSERT INTO attender (name, code, is_active) VALUES (?, ?, 1)", name, code);
        }
    }

    @Transactional
    public void setAttenderActive(Long id, boolean active) {
        int updated = jdbcTemplate.update("UPDATE attender SET is_active = ? WHERE id = ?", active ? 1 : 0, id);
        if (updated == 0) {
            throw new RuntimeException("Attender not found");
        }
    }

    @Transactional
    public void changePassword(Long uid, ChangePasswordRequest request) {
        if (request == null) {
            throw new RuntimeException("Missing required parameters.");
        }
        String oldPassword = required(request.getOldPassword(), "Existing password is required");
        String newPassword = required(request.getNewPassword(), "New password is required");
        String confirm = request.getConfirmPassword() == null ? "" : request.getConfirmPassword();
        if (oldPassword.equals(newPassword)) {
            throw new RuntimeException("Old password and new password should not match!");
        }
        if (!confirm.equals(newPassword)) {
            throw new RuntimeException("New password and confirm password should match!");
        }
        List<String> rows = jdbcTemplate.query(
                "SELECT password FROM users WHERE id = ? AND is_active = 1",
                (rs, i) -> rs.getString(1),
                uid
        );
        if (rows.isEmpty() || !passwordEncoder.matches(oldPassword, rows.get(0))) {
            throw new RuntimeException("Your existing password is wrong!");
        }
        jdbcTemplate.update("UPDATE users SET password = ? WHERE id = ?", passwordEncoder.encode(newPassword), uid);
    }

    public List<UserDiscountData> discounts() {
        return jdbcTemplate.query(
                "SELECT id, user_name, IFNULL(fullName,'') AS fullName, IFNULL(disc_per, 100) AS disc_per " +
                        "FROM users WHERE is_active = 1 ORDER BY user_name",
                (rs, i) -> {
                    UserDiscountData row = new UserDiscountData();
                    row.setId(rs.getLong("id"));
                    row.setUserName(rs.getString("user_name"));
                    row.setFullName(rs.getString("fullName"));
                    row.setDiscPer(rs.getInt("disc_per"));
                    return row;
                }
        );
    }

    @Transactional
    public void updateDiscount(Long userId, DiscountUpdateRequest request) {
        requireUser(userId);
        int discPer = request == null || request.getDiscPer() == null ? -1 : request.getDiscPer();
        if (discPer < 0 || discPer > 100) {
            throw new RuntimeException("Discount must be between 0 and 100");
        }
        jdbcTemplate.update("UPDATE users SET disc_per = ? WHERE id = ?", discPer, userId);
    }

    private void saveModulePermissions(Long uid, List<Long> moduleIds) {
        if (moduleIds == null) {
            return;
        }
        for (Long moduleId : moduleIds) {
            if (moduleId == null) {
                continue;
            }
            jdbcTemplate.update(
                    "INSERT INTO user_permission (uid, module_id, date, time) VALUES (?, ?, NOW(), NOW())",
                    uid, moduleId
            );
        }
    }

    private void requireUser(Long userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ?",
                Integer.class,
                userId
        );
        if (count == null || count == 0) {
            throw new RuntimeException("User not found");
        }
    }

    private String userDisplayName(Long userId) {
        List<UserOptionData> rows = jdbcTemplate.query(
                "SELECT id, user_name, IFNULL(fullName,'') AS fullName FROM users WHERE id = ?",
                (rs, i) -> mapUserOption(rs.getLong("id"), rs.getString("user_name"), rs.getString("fullName")),
                userId
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        return rows.get(0).getName();
    }

    private UserOptionData mapUserOption(Long id, String userName, String fullName) {
        UserOptionData row = new UserOptionData();
        row.setId(id);
        row.setUserName(userName);
        row.setFullName(fullName);
        String display = fullName == null || fullName.isBlank()
                ? userName
                : fullName + " (" + userName + ")";
        row.setName(display);
        return row;
    }

    private String required(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException(message);
        }
        return value.trim();
    }
}
