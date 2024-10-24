<?php

/**
 * Add a new column to the existing custom table.
 *
 * @return void
 */
function wepos_1_3_6_updates() {
    global $wpdb;

    $table_name = $wpdb->prefix . PARTIAL_PAYMENT_TABLE;
    $column_name = 'refund';

    // Check if the column doesn't exist, then add it
    if (!$wpdb->get_var("SHOW COLUMNS FROM $table_name LIKE '$column_name'")) {
        $sql = "ALTER TABLE $table_name ADD $column_name double NOT NULL DEFAULT '0';";
        $wpdb->query($sql);
    }
}

wepos_1_3_6_updates();
