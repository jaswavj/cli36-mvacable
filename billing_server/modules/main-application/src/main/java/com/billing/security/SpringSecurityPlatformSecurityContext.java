package com.billing.security;

import com.billing.data.AppUser;
import com.billing.filters.AppContext;
import org.springframework.stereotype.Component;

@Component
public class SpringSecurityPlatformSecurityContext implements PlatformSecurityContext {

    @Override
    public AppUser authenticateUser() {
        AppUser appUser = AppContext.get();
        if (appUser == null) {
            throw new RuntimeException("User is not authenticated");
        }
        return appUser;
    }
}
