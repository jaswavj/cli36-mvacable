package com.billing.domain;

import com.billing.dtos.UserDTO;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity(name = "Users")
@Table(name = "users")
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_name", nullable = false)
    private String userName;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "fullName")
    private String fullName;

    @Column(name = "disc_per")
    private Integer discPer = 100;

    @Column(name = "shop_id")
    private String shopId;

    @Column(name = "is_admin")
    private Integer isAdmin = 0;

    public UserDTO to() {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(id);
        userDTO.setName(fullName != null && !fullName.isBlank() ? fullName : userName);
        userDTO.setUserName(userName);
        userDTO.setFullName(fullName);
        userDTO.setShopId(shopId);
        userDTO.setIsAdmin(isAdmin == null ? 0 : isAdmin);
        userDTO.setDiscPer(discPer);
        return userDTO;
    }
}
