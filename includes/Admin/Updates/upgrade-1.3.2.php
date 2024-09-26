<?php

/**
 * @return void
 */
function wepos_1_3_2_updates() {
    global $wpdb;

    $table_name = $wpdb->prefix . USER_ACTIVITY_LOG_TABLE;
    $table_name = esc_sql($table_name);
    $charset_collate = $wpdb->get_charset_collate();

    if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
    $sql = "CREATE TABLE $table_name (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            log_type VARCHAR(20) NOT NULL,
            reference_id BIGINT(20) UNSIGNED NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            details TEXT NOT NULL,
            action_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    }
}

wepos_1_3_2_updates();

