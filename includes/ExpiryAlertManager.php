<?php

namespace WeDevs\WePOS;

class ExpiryAlertManager
{

    /**
     * Number of products to process at a time
     * @var int
     */
    private int $batch_size = 100;

    /**
     * Number of products to display per page
     * @var int
     */
    private int $per_page = 10;

    public function __construct() {
        // Schedule the daily event
        add_action('wp', [$this, 'wepos_schedule_daily_event']);
        // Hook the expiry check function to the scheduled event
        add_action('wepos_check_expiry_event', [$this, 'check_expiry_and_send_alerts']);
        // Add expired products page in admin
        add_action('admin_menu', [$this, 'register_expiring_products_page']);
    }

    /**
     * Schedule the daily event
     * @return void
     */
    public function wepos_schedule_daily_event() {
        if (!wp_next_scheduled('wepos_check_expiry_event')) {
            wp_schedule_event(time(), 'daily', 'wepos_check_expiry_event');
        }
    }

    /**
     * Check expiry and send alerts for each product
     * @return void
     */
    public function check_expiry_and_send_alerts() {

            $offset = 0; // Start at the first product

            do {
                // Query a batch of products with the expiry rule set to 'yes'
                $args = [
                    'post_type'      => 'product',
                    'posts_per_page' => $this->batch_size,
                    'offset'         => $offset,
                    'meta_query'     => [
                        [
                            'key'     => '_expiry_rule',
                            'value'   => 'yes',
                            'compare' => '='
                        ],
                        [
                            'key'     => '_expiry_data',
                            'compare' => 'EXISTS'
                        ]
                    ]
                ];

                $products = get_posts($args);
                foreach ($products as $product) {
                    $this->process_product($product);
                }

                $offset += $this->batch_size; // Move to the next batch

                // Check if we have processed all products
            } while (count($products) === $this->batch_size); // Stop if we get less than the batch size
    }

    /**
     * Process a single product
     * @param $product
     * @return void
     */
    private function process_product($product) {
        $product_id = $product->ID;
        $expiry_dates = get_post_meta($product_id, '_expiry_data', true);
        $expiry_alert_duration = (int) get_post_meta($product_id, '_expiry_alert_duration', true);
        $expired_alert_sent = get_post_meta($product_id, '_expired_alert_sent', true) ?: 'no';
        if (!empty($expiry_dates) && is_array($expiry_dates)) {
            $expiry_dates = array_filter($expiry_dates, static fn($item) => strtotime($item['date']) - $expiry_alert_duration <= time());

            if ($expiry_dates && $expired_alert_sent !== 'yes') {
                $this->send_expiry_alert($product_id, $product->post_title, $expiry_dates);
                update_post_meta($product_id, '_expired_alert_sent', 'yes');
            }
        }
    }


    /**
     * Send an expiry alert
     * @param $product_id
     * @param $name
     * @param $expiry_dates
     * @return void
     */
    private function send_expiry_alert($product_id, $name, $expiry_dates) {

        // Prepare the email subject
        $subject = 'Product Expiry Alert';

        // Start building the message
        $message = "The following product items are close to expiring:\n\n";
        $message .= "Product ID: {$product_id}\n";
        $message .= "Item Name: {$name}\n\n";

        // If sending as plain text, build a simple table using padding
        $message .= "------------------------------------------------------------------\n";
        $message .= "| Expiry Date          | Quantity           | Company Name         |\n";
        $message .= "------------------------------------------------------------------\n";

        // Loop through the expiry_dates array to build table rows
        foreach ($expiry_dates as $expiry) {
            $company_name = empty($expiry['company']) ? 'N/A' : $expiry['company'];
            $expiry_date = $expiry['date'];
            $quantity = $expiry['quantity'];

            // Append data in a fixed width format
            $message .= sprintf("| %-20s | %-18s | %-20s |\n", $expiry_date, $quantity,$company_name);
        }

        // End of the table
        $message .= "------------------------------------------------------------------\n";

        // Send the email (assuming send_mail_to_admins is a function for this purpose)
        send_mail_to_admins($subject, $message);
    }





    /**
     * Register expired products page
     * @return void
     */
    public function register_expiring_products_page() {
        add_submenu_page(
            'edit.php?post_type=product',
            'Expiring Products',
            'Expiring Products',
            'manage_woocommerce',
            'expiring-products',
            [$this, 'expiring_products_page_content']
        );
    }

    /**
     * Display the expired products page content
     * @return void
     */
    public function expiring_products_page_content() {
        global $wpdb;

        $paged = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
        $expired_products = paginate_expiring_products($this->per_page, $paged);

        echo '<div class="wrap">';
        echo '<h1>Expired/Expiring Products</h1>';
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>Product Name</th><th>Expiry Details (Quantity, Date, Company, Status)</th></tr></thead><tbody>';

        if ($expired_products['status']) {
            $date_format = get_option('date_format');
            foreach ($expired_products['data']['products'] as $product) {
                echo '<tr><td><a href="' . get_edit_post_link($product->ID) . '">' . esc_html($product->post_title) . '</a></td><td>';
                foreach ($product->expiry_data as $expiry_date) {
                    $is_expired = strtotime($expiry_date['date']) < time();
                    echo '<div>' . $expiry_date['quantity'] . 'x ' . date($date_format, strtotime($expiry_date['date'])) . ' ( <span class="text-info">' . (!empty($expiry_date['company']) ? $expiry_date['company'] : 'NaN') . ' </span>)' .
                        ' (<span class="text-' . ($is_expired ? 'danger' : 'warning') . '">' .
                        ($is_expired ? 'Expired' : 'Expiring soon') . '</span>)</div>';
                }
                echo '</td></tr>';
            }
        } else {
            echo '<tr><td colspan="2" style="text-align:center;">No expired products found.</td></tr>';
        }

        echo '</tbody></table>';

        // Pagination
        $total_products = $expired_products['data']['total_products'] ?? 0;
        $total_pages = ceil($total_products / $this->per_page);
        $current_page = max(1, $paged);

        echo '<div class="tablenav bottom"><div class="tablenav-pages">';
        echo '<span class="displaying-num">' . esc_html($total_products) . ' items</span>';
        echo '<span class="pagination-links">';

        // First & Previous links
        $prev_disabled = $current_page <= 1 ? 'disabled' : '';
        echo '<a class="first-page button ' . $prev_disabled . '" href="' . esc_url(add_query_arg('paged', 1)) . '">&laquo;</a>';
        echo '<a class="prev-page button ' . $prev_disabled . '" href="' . esc_url(add_query_arg('paged', $current_page - 1)) . '">&lsaquo;</a>';

        // Page display
        echo '<span class="paging-input"><span class="tablenav-paging-text">' . esc_html($current_page) . ' of ' . esc_html($total_pages) . '</span></span>';

        // Next & Last links
        $next_disabled = $current_page >= $total_pages ? 'disabled' : '';
        echo '<a class="next-page button ' . $next_disabled . '" href="' . esc_url(add_query_arg('paged', $current_page + 1)) . '">&rsaquo;</a>';
        echo '<a class="last-page button ' . $next_disabled . '" href="' . esc_url(add_query_arg('paged', $total_pages)) . '">&raquo;</a>';

        echo '</span></div></div></div>';
    }



}