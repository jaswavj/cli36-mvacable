package com.billing.filters;

import com.billing.data.AppUser;
import lombok.experimental.UtilityClass;

@UtilityClass
public class AppContext {

    private static final ThreadLocal<AppUser> CONTEXT = new ThreadLocal<>();

    public static void set(AppUser appUser) {
        CONTEXT.set(appUser);
    }

    public static AppUser get() {
        return CONTEXT.get();
    }

    public static void destroy() {
        CONTEXT.remove();
    }
}
