package com.billing.security;

import com.billing.data.AppUser;

public interface PlatformSecurityContext {

    AppUser authenticateUser();
}
