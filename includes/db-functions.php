<?php

/**
 * Insert partial payment stat
 * @param $order_id
 * @param $paid
 * @param string $method
 * @param int $refund
 * @return int|WP_Error
 */
function insert_partial_payment_stat($order_id, $paid, $method = 'Cash', $refund = 0) {
	global $wpdb;

    if (!defined('PARTIAL_PAYMENT_TABLE')) {
        return new WP_Error('db_table_error', 'Partial payment table constant not defined.');
    }

	$table_name = $wpdb->prefix . PARTIAL_PAYMENT_TABLE;

	$result = $wpdb->insert(
		$table_name,
		array(
			'order_id' => $order_id,
			'paid' => $paid,
			'date_created' => current_time('mysql'),
            'refund' => $refund,
            'method' => $method
		),
		array(
			'%d',
			'%f',
			'%s',
            '%f',
            '%s'
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
 * @param string $orderBy
 * @param string $order
 * @return array|WP_Error
 */
function get_partial_payment_stats($order_id, $orderBy = 'ID', $order = 'DESC') {
	global $wpdb;
	$table_name = $wpdb->prefix . PARTIAL_PAYMENT_TABLE;

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
 * Get total paid amount of an order from database
 * @param $order_id
 *
 * @return string|WP_Error|null
 */
function get_total_paid_query($order_id) {
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
 * Get total paid amount from partial payment results
 * @param $partial_payment_results
 * @return void
 */
function get_total_paid($partial_payment_results)
{
    $total_paid = 0;
    foreach ($partial_payment_results as $partial_payment_result) {
        $total_paid += $partial_payment_result->paid;
    }
    return $total_paid;

}

/**
 * Get due amount
 * @param $order_id
 * @param $total_amount
 *
 * @return int|string|WP_Error|null
 */
function get_due_amount($order_id, $total_amount) {
	$total_paid = get_total_paid_query($order_id);

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
            ],
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

/**
 * Paginate low stock products using WP_Query
 *
 * @param int $per_page
 * @param int $current_page
 * @return array
 */
function paginate_low_stock_products($per_page = 10, $current_page = 1) {
    global $wpdb;
    // Determine the offset and whether to apply LIMIT
    $limit_sql = '';
    if ($per_page > 0) {
        $offset = ($current_page - 1) * $per_page;
        $limit_sql = "LIMIT %d OFFSET %d";
    } else {
        $offset = 0; // Just a placeholder; it won't be used
    }

    // Raw SQL to fetch low stock products for pagination
    $sql = "
        SELECT 
            p.ID, 
            p.post_title, 
            pm1.meta_value AS stock_qty, 
            pm2.meta_value AS low_stock_threshold,
            (CAST(pm1.meta_value AS UNSIGNED) * CAST(wp_postmeta_price.meta_value AS DECIMAL)) AS total_price  -- Calculate total stock price for each product
        FROM {$wpdb->posts} p
        JOIN {$wpdb->postmeta} pm1 ON (p.ID = pm1.post_id AND pm1.meta_key = '_stock')
        JOIN {$wpdb->postmeta} pm2 ON (p.ID = pm2.post_id AND pm2.meta_key = '_low_stock_amount')
        JOIN {$wpdb->postmeta} wp_postmeta_price ON (p.ID = wp_postmeta_price.post_id AND wp_postmeta_price.meta_key = '_price')
        WHERE p.post_type = 'product'
        AND p.post_status = 'publish'
        AND CAST(pm1.meta_value AS UNSIGNED) < CAST(pm2.meta_value AS UNSIGNED)
        AND CAST(pm1.meta_value AS UNSIGNED) > 0
        " . ($limit_sql ? sprintf($limit_sql, $per_page, $offset) : '');

    // Fetch products for the current page
    $products = $wpdb->get_results($wpdb->prepare($sql, $per_page, $offset));

    if($per_page !== '-1') {
    // Fetch total stock price based on all low stock products
    $total_stock_price_query = "
        SELECT 
            COUNT(*) AS total_stock_qty,
            SUM(CAST(pm1.meta_value AS UNSIGNED) * CAST(wp_postmeta_price.meta_value AS DECIMAL)) AS total_stock_price
        FROM {$wpdb->posts} p
        JOIN {$wpdb->postmeta} pm1 ON (p.ID = pm1.post_id AND pm1.meta_key = '_stock')
        JOIN {$wpdb->postmeta} pm2 ON (p.ID = pm2.post_id AND pm2.meta_key = '_low_stock_amount')
        JOIN {$wpdb->postmeta} wp_postmeta_price ON (p.ID = wp_postmeta_price.post_id AND wp_postmeta_price.meta_key = '_price')
        WHERE p.post_type = 'product'
        AND p.post_status = 'publish'
        AND CAST(pm1.meta_value AS UNSIGNED) < CAST(pm2.meta_value AS UNSIGNED)
        AND CAST(pm2.meta_value AS UNSIGNED) > 0
    ";

    // total stock price for all low stock products
    $total_stock_price = $wpdb->get_var($total_stock_price_query, 1);

        // total products for pagination
        $total_products = $wpdb->get_var($total_stock_price_query);
    }
    // If no products found
    if (empty($products)) {
        return [
            'status'  => false,
            'message' => 'No low stock products found.',
        ];
    }


    return [
        'status' => true,
        'data'   => [
            'total_products'   => $total_products?? 0,
            'products'         => array_map(static function ($product) {
                return (object)[
                    'ID'                 => $product->ID,
                    'post_title'         => $product->post_title,
                    'stock_qty'          => $product->stock_qty,
                    'low_stock_threshold'=> $product->low_stock_threshold,
                ];
            }, $products),
            'total_stock_price' => $total_stock_price?? 0,
        ],
    ];
}



/**
 * Custom pagination format for displaying products
 * @param $total_products
 * @param $total_pages
 * @param $current_page
 * @param $left_data
 * @return void
 */
function custom_pagination_format($total_products, $total_pages, $current_page, $left_data = null) {
    echo '<div class="tablenav bottom">';

    if ($left_data) {
        echo '<div class="alignleft">' . $left_data . '</div>';
    }

    echo '<div class="tablenav-pages">';
    echo '<span class="mx-1 displaying-num">' . esc_html($total_products) . ' items</span>';
    echo '<span class="pagination-links">';

    // Helper function to create pagination links
    $create_link = static fn($page, $label, $is_disabled = false)=>
        $is_disabled ?
            '<span class="mx-1 button disabled">' . $label . '</span>' :
            '<a class="mx-1 button" href="' . esc_url(add_query_arg('paged', $page)) . '">' . $label . '</a>';

    // First & Previous links
    echo $create_link(1, '&laquo;', $current_page <= 1);
    echo $create_link($current_page - 1, '&lsaquo;', $current_page <= 1);

    // Page display
    echo '<span class="mx-1 paging-input"><span class="tablenav-paging-text">' . esc_html($current_page) . ' of ' . esc_html($total_pages) . '</span></span>';

    // Next & Last links
    echo $create_link($current_page + 1, '&rsaquo;', $current_page >= $total_pages);
    echo $create_link($total_pages, '&raquo;', $current_page >= $total_pages);

    echo '</span></div></div>';
}

