package com.billing.data;

import com.billing.domain.User;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AppUser {

    private Long id;

    private User user;

    public String shopId() {
        return user == null || user.getShopId() == null ? "" : user.getShopId();
    }

    public int isAdmin() {
        return user != null && user.getIsAdmin() != null ? user.getIsAdmin() : 0;
    }
}
