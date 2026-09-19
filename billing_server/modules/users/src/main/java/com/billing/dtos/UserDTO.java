package com.billing.dtos;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class UserDTO {

    private Long id;

    private String name;

    private String userName;

    private String fullName;

    private String shopId;

    private Integer isAdmin;

    private String accessToken;

    private Integer discPer;

    private List<Long> moduleIds = new ArrayList<>();
}
