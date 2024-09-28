<?php
namespace WeDevs\WePOS\Admin;

use WP_Error;


class UserActivityLogger {

    public function __construct() {
        add_action('wp_ajax_wepos_get_user_activity_logs', array($this, 'get_user_activity_logs'), 10);
        // Hook into WooCommerce product save action
        add_action('save_post_product', [$this, 'track_product_price_change'], 10, 3);
    }

    /**
     * Get user activity logs
     */
    public function get_user_activity_logs()
    {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(__('You do not have permission to view activity logs', 'wepos'));
        }

        $current_page = isset($_POST['page']) ? absint($_POST['page']) : 1;
        $logs_per_page = isset($_POST['per_page']) ? absint($_POST['per_page']) : 10;

        $activity_logs = paginate_user_activity_logs($logs_per_page, $current_page);

        if (!$activity_logs['status']) {
            wp_send_json_error(__($activity_logs['message'], 'wepos'));
        }

        $total_pages = max(1, ceil($activity_logs['data']['total_logs'] / $logs_per_page));

        $next_page = $current_page + 1 > $total_pages ? $total_pages : $current_page + 1;
        $prev_page = $current_page - 1 > 0 ? $current_page - 1 : 1;


        wp_send_json_success([
            'logs' => $activity_logs['data']['logs'],
            'total_logs' => $activity_logs['data']['total_logs'],
            'total_pages' => $total_pages,
            'next_page' => $next_page,
            'prev_page' => $prev_page,
            'admin_url' => admin_url(),
        ]);
    }


    /**
     * Track product price change
     *
     * @param int $post_id
     * @param WP_Post $post
     * @return void
     */
    public function track_product_price_change($post_id, $post, $update)
    {
        // Check if this is a WooCommerce product
        if ($post->post_type !== 'product' || !$update) {
            return;
        }

        // Avoid triggering on autosaves or revisions
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (wp_is_post_revision($post_id)) {
            return;
        }

        // Get old and new prices
        $old_prices = [
            'regular' => get_post_meta($post_id, '_regular_price', true),
            'sale' => get_post_meta($post_id, '_sale_price', true),
            'local' => get_post_meta($post_id, '_local_price', true),
            'export' => get_post_meta($post_id, '_export_price', true)
        ];

        if (!$old_prices['regular'] && !$old_prices['sale'] && !$old_prices['local'] && !$old_prices['export']) {
            return;
        }

        // Get new prices
        $new_prices = [
            'regular' => sanitize_text_field($_POST['_regular_price']) ?? '',
            'sale' => sanitize_text_field($_POST['_sale_price'])?? '',
            'local' => sanitize_text_field($_POST['_local_price'])?? '',
            'export' => sanitize_text_field($_POST['_export_price']) ??'',
        ];

        // Check for price changes and log them
        $changes = [];
        foreach ($old_prices as $key => $old_price) {
            $newFormated = number_format((float)str_replace(',', '.', $new_prices[$key]), 2, '.', '');
            $old_price = number_format((float)str_replace(',', '.', $old_price), 2, '.', '');
            if ($old_price !== $new_prices[$key] && $old_price !== $newFormated) {
                $changes[] = "$key price of $old_price to $newFormated";
            }
        }

        if ($changes) {
            $action_data = implode(', ', $changes);

            // Log the price change
            insert_user_activity_log('product', $post_id, $action_data);

            // Send email to admin about the price change
            $this->send_price_change_email_to_admin('product', $post_id, $action_data);
        }
    }

	/**
	 * Send email notification to admin
	 *
	 * @param $log_type
	 * @param $reference_id
	 * @param $action_data
	 *
	 * @return void
	 */
    private function send_price_change_email_to_admin($log_type, $reference_id, $action_data) {
        // Get admin email
        $admin_email = get_option('admin_email');

        // Prepare email subject and message
        $subject = ucfirst($log_type) . ' Change Notification';
        $message = sprintf(
            'The %s of %s ID %d has been changed from %s. by %s.',
            ($log_type === 'product' ? 'price' : 'total'),
            $log_type,
            $reference_id,
            $action_data,
            ucfirst(wp_get_current_user()->user_login),
        );

        // Send email to admin
        wp_mail($admin_email, $subject, $message);
    }
}
