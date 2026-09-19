package com.billing.service;

import com.billing.core.response.ResponseDO;
import com.billing.domain.User;
import com.billing.model.AuthModel;

import java.util.List;
import java.util.Optional;

public interface AuthService {

    ResponseDO doLogin(AuthModel authModel);

    Optional<User> fetchById(Long userId);

    List<Long> moduleIds(Long userId);
}
