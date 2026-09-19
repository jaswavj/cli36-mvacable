package com.billing.controllers;

import com.billing.core.response.ResponseDO;
import com.billing.data.AppUser;
import com.billing.domain.User;
import com.billing.dtos.UserDTO;
import com.billing.model.AuthModel;
import com.billing.security.PlatformSecurityContext;
import com.billing.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class UserController {

    private final AuthService authService;
    private final PlatformSecurityContext platformSecurityContext;

    @PostMapping("/login")
    public ResponseDO doLogin(@RequestBody AuthModel authModel) {
        return this.authService.doLogin(authModel);
    }

    @GetMapping("/getLoginUser")
    public ResponseDO getLoginUser(@RequestHeader(HttpHeaders.AUTHORIZATION) String token) {
        AppUser appUser = this.platformSecurityContext.authenticateUser();
        User user = appUser.getUser();
        UserDTO userDTO = user.to();
        userDTO.setModuleIds(authService.moduleIds(user.getId()));
        if (token != null && token.startsWith("Bearer ")) {
            userDTO.setAccessToken(token.substring("Bearer ".length()));
        }
        ResponseDO responseDO = new ResponseDO();
        responseDO.setSuccess(true);
        responseDO.setData(userDTO);
        return responseDO;
    }
}
