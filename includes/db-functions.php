<?php

/**
 * Insert partial payment stat
 * @param $order_id
 * @param $paid
 *
 * @return int|WP_Error
 */
function insert_partial_payment_stat($order_id, $paid) {
	global $wpdb;
	$table_name = $wpdb->prefix . PARTIAL_PAYMENT_TABLE;
    $table_name =  esc_sql($table_name);

	$result = $wpdb->insert(
		$table_name,
		array(
			'order_id' => $order_id,
			'paid' => $paid,
			'date_created' => current_time('mysql'),
		),
		array(
			'%d',
			'%f',
			'%s',
		)
	);

	if ($result === false) {
		return new WP_Error('db_insert_error', 'Could not insert data into the database', $wpdb->last_error);
	}

	return $wpdb->insert_id;
}

/**
 * Get partial payment stats
 * @param $order_id
 *
 * @return array|WP_Error
 */
function get_partial_payment_stats($order_id, $orderBy = 'ID', $order = 'DESC') {
	global $wpdb;
	$table_name = $wpdb->prefix . PARTIAL_PAYMENT_TABLE;
    $table_name =  esc_sql($table_name);

	$allowed_columns = array('ID', 'paid', 'date_created');
	$orderBy = in_array( $orderBy, $allowed_columns, true ) ? $orderBy : 'ID';
	$order = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';

	$query = $wpdb->prepare("SELECT * FROM $table_name WHERE order_id = %d ORDER BY $orderBy $order", $order_id);
	$results = $wpdb->get_results($query);

	if ($results === false) {
		return new WP_Error('db_query_error', 'Could not retrieve data from the database', $wpdb->last_error);
	}

	return $results;
}


/**
 * Get total paid
 * @param $order_id
 *
 * @return string|WP_Error|null
 */
function get_total_paid($order_id) {
	global $wpdb;
	$table_name = $wpdb->prefix . PARTIAL_PAYMENT_TABLE;
    $table_name =  esc_sql($table_name);

	$query = $wpdb->prepare("SELECT SUM(paid) as total_paid FROM $table_name WHERE order_id = %d", $order_id);
	$result = $wpdb->get_var($query);

	if ($result === false) {
		return new WP_Error('db_query_error', 'Could not retrieve data from the database', $wpdb->last_error);
	}

	return $result ?? '0';
}

/**
 * Get due amount
 * @param $order_id
 * @param $total_amount
 *
 * @return int|string|WP_Error|null
 */
function get_due_amount($order_id, $total_amount) {
	$total_paid = get_total_paid($order_id);

	if (is_wp_error($total_paid)) {
		return $total_paid;
	}

	$due_amount = $total_amount - $total_paid;

	return $due_amount < 0 ? 0 : $due_amount;
}

/**
 * insert to user activity log table
 * @param $log_type
 * @param $reference_id
 * @param $action_data
 * @return void
 */
function insert_user_activity_log($log_type, $reference_id, $action_data) {
    global $wpdb;

    // Get current user info
    $current_user = wp_get_current_user();
    $user_id = $current_user->ID;
    $table_name = $wpdb->prefix . USER_ACTIVITY_LOG_TABLE;
    $table_name =  esc_sql($table_name);
    $user_name = $current_user->user_login;

    // Prepare log details
    $details = sprintf(
        'User %s changed %s ID %d from %s',
        $user_name,
        $log_type,
        $reference_id,
        $action_data
    );

    // Insert log into the custom table
    $result = $wpdb->insert(
        $table_name,
        [
            'log_type'    => $log_type,
            'reference_id'=> $reference_id,
            'user_id'     => $user_id,
            'details'     => $details,
            'action_time' => current_time('mysql'),
        ],
        ['%s', '%d', '%d', '%s', '%s']
    );

    if ($result === false) {
        return new WP_Error('db_insert_error', 'Could not insert data into the database', $wpdb->last_error);
    }

    return $wpdb->insert_id;
}

/**
 * display user activity logs on the custom admin page
 * @return array
 */
function paginate_user_activity_logs($logs_per_page = 10, $current_page = 1) {
    global $wpdb;
    $table_name = $wpdb->prefix . USER_ACTIVITY_LOG_TABLE;
    $table_name = esc_sql($table_name);

    // Get page number from request
    $offset = ($current_page - 1) * $logs_per_page;

    // Fetch logs with pagination
    $total_logs = $wpdb->get_var("SELECT COUNT(*) FROM {$table_name}");
    $logs = $wpdb->get_results($wpdb->prepare(
        "SELECT l.*, u.user_login FROM {$table_name} l
             LEFT JOIN {$wpdb->prefix}users u ON l.user_id = u.ID
             ORDER BY l.action_time DESC LIMIT %d OFFSET %d",
        $logs_per_page, $offset
    ));

    // Prepare pagination
    if ($logs === false) {
        return      [
            'status'     => false,
            'message'    => 'Could not retrieve data from the database: '.$wpdb->last_error,
        ];
    }

    return [
        'status'     => true,
        'data' => [
        'total_logs' => $total_logs?? 0,
        'logs'       => $logs,
        ],
    ];
}

/**
 * @param int $per_page
 * @param int $current_page
 * @return array
 */
function paginate_expiring_products($per_page = 10, $current_page = 1)
{
    // Set up query arguments
    $args = [
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => $per_page,
        'paged'          => $current_page,
        'meta_query'     => [
            [
                'key'     => '_expiry_data',
                'compare' => 'EXISTS',
            ],
            [
                'key'     => '_expiry_rule',
                'value'   => 'yes',
                'compare' => '=',
            ],
            [
                'key'     => '_expired_alert_sent',
                'value'   => 'yes',
                'compare' => '=',
            ]
        ],
    ];

    // WP_Query instance
    $query = new WP_Query($args);

    // If no posts found
    if (!$query->have_posts()) {
        return [
            'status'  => false,
            'message' => 'No expiring products found.',
        ];
    }

    $expiring_products = [];

    // Loop through the posts
    while ($query->have_posts()) {
        $query->the_post();

        $expiry_data = get_post_meta(get_the_ID(), '_expiry_data', true);
        $expiry_alert_duration = (int)get_post_meta(get_the_ID(), '_expiry_alert_duration', true);
        $expiry_alert_duration = ($expiry_alert_duration+0.5) * DAY_IN_SECONDS;

        if ($expiry_data) {
            $expiry_data = maybe_unserialize($expiry_data);
            $expiry_data = array_filter($expiry_data, static fn($item) => $item['date'] && (strtotime($item['date'])-$expiry_alert_duration) <= time());
            $expiring_products[] = (object)[
                'ID'          => get_the_ID(),
                'post_title'  => get_the_title(),
                'expiry_data' => $expiry_data,
            ];
        }
    }

    // Reset post data to avoid conflicts
    wp_reset_postdata();

    return [
        'status' => true,
        'data'   => [
            'total_products' => $query->found_posts,
            'products'       => $expiring_products,
        ],
    ];
}