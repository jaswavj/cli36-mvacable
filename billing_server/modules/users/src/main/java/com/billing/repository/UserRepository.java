package com.billing.repository;

import com.billing.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUserNameAndIsActive(String userName, Integer isActive);

    Optional<User> findByUserNameAndShopIdAndIsActive(String userName, String shopId, Integer isActive);

    @Query(value = "SELECT module_id FROM user_permission WHERE uid = :userId", nativeQuery = true)
    List<Number> findModuleIdsByUserId(@Param("userId") Long userId);
}
