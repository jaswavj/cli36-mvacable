package com.billing.users;

import com.billing.core.response.ResponseDO;
import com.billing.security.PlatformSecurityContext;
import com.billing.users.dto.AttenderSaveRequest;
import com.billing.users.dto.ChangePasswordRequest;
import com.billing.users.dto.CreateUserRequest;
import com.billing.users.dto.DiscountUpdateRequest;
import com.billing.users.dto.PermissionUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserAdminController {

    private final UserAdminService userAdminService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/modules")
    public ResponseDO modules() {
        return ok(userAdminService.modules());
    }

    @GetMapping("/list")
    public ResponseDO users(
            @RequestParam(required = false) String shopId,
            @RequestParam(required = false) Boolean blocked
    ) {
        return ok(userAdminService.users(shopId, Boolean.TRUE.equals(blocked)));
    }

    @GetMapping("/outlets")
    public ResponseDO outlets() {
        return ok(userAdminService.outlets());
    }

    @PostMapping
    public ResponseDO createUser(@RequestBody CreateUserRequest request) {
        userAdminService.createUser(request, securityContext.authenticateUser());
        return ok(true);
    }

    @GetMapping("/{id}/permissions")
    public ResponseDO modulePermissions(@PathVariable Long id) {
        return ok(userAdminService.modulePermissions(id));
    }

    @PostMapping("/{id}/permissions")
    public ResponseDO updateModulePermissions(@PathVariable Long id, @RequestBody PermissionUpdateRequest request) {
        userAdminService.updateModulePermissions(id, request);
        return ok(true);
    }

    @PostMapping("/{id}/block")
    public ResponseDO blockUser(@PathVariable Long id) {
        userAdminService.setUserActive(id, false, currentUserId());
        return ok(true);
    }

    @PostMapping("/{id}/unblock")
    public ResponseDO unblockUser(@PathVariable Long id) {
        userAdminService.setUserActive(id, true, currentUserId());
        return ok(true);
    }

    @GetMapping("/{id}/special-permissions")
    public ResponseDO specialPermissions(@PathVariable Long id) {
        return ok(userAdminService.specialPermissions(id));
    }

    @PostMapping("/{id}/special-permissions")
    public ResponseDO updateSpecialPermissions(@PathVariable Long id, @RequestBody PermissionUpdateRequest request) {
        userAdminService.updateSpecialPermissions(id, request);
        return ok(true);
    }

    @GetMapping("/attenders")
    public ResponseDO attenders() {
        return ok(userAdminService.attenders());
    }

    @PostMapping("/attenders")
    public ResponseDO saveAttender(@RequestBody AttenderSaveRequest request) {
        userAdminService.saveAttender(request);
        return ok(true);
    }

    @PostMapping("/attenders/{id}/block")
    public ResponseDO blockAttender(@PathVariable Long id) {
        userAdminService.setAttenderActive(id, false);
        return ok(true);
    }

    @PostMapping("/attenders/{id}/unblock")
    public ResponseDO unblockAttender(@PathVariable Long id) {
        userAdminService.setAttenderActive(id, true);
        return ok(true);
    }

    @PostMapping("/change-password")
    public ResponseDO changePassword(@RequestBody ChangePasswordRequest request) {
        userAdminService.changePassword(currentUserId(), request);
        return ok(true);
    }

    @GetMapping("/discounts")
    public ResponseDO discounts() {
        return ok(userAdminService.discounts());
    }

    @PostMapping("/{id}/discount")
    public ResponseDO updateDiscount(@PathVariable Long id, @RequestBody DiscountUpdateRequest request) {
        userAdminService.updateDiscount(id, request);
        return ok(true);
    }

    private Long currentUserId() {
        return securityContext.authenticateUser().getId();
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
