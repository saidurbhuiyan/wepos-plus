<?php

namespace WeDevs\WePOS;

class LowStockManager
{
    public function __construct() {
        // Hook to add admin menu
        add_action('admin_menu', [$this, 'add_low_stock_page']);
        // Hook to output CSV download
        add_action('admin_init', [$this, 'download_low_stock_csv']);
    }

    /**
     * Function to add the Low Stock Page to the Products menu
     * @return void
     */
    public function add_low_stock_page() {
        add_submenu_page(
            'edit.php?post_type=product',
            'Low Stock Products',
            'Low Stock Products',
            'manage_woocommerce',
            'wc-low-stock-products',
            [$this, 'render_low_stock_page']
        );
    }

    /**
     * Function to render the low stock page
     * @return void
     */
    public function render_low_stock_page() {
        // Pagination parameters
        $paged = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
        $per_page = 2;

        // Get low stock products
        $low_stock_result = paginate_low_stock_products($per_page, $paged);

        $low_stock_products = $low_stock_result['data']['products']?? null;
        $total_products = $low_stock_result['data']['total_products']?? 0;

        // Pagination settings
        $total_pages = ceil($total_products / $per_page);

        // Display the low stock products
        echo '<div class="wrap">';
        echo '<h1>Low Stock Products</h1>';

        // Download CSV button
        echo '<div style="float: right; margin-top: -38px;">';
        echo '<a href="' . esc_url(admin_url('admin.php?page=wc-low-stock-products&download_csv=true')) . '" class="button button-primary">Download CSV</a>';
        echo '</div>';

        //table
        echo '<table class="wp-list-table widefat fixed striped posts">';
        echo '<thead><tr>';
        echo '<th>' . esc_html__('Product Title', 'woocommerce') . '</th>';
        echo '<th>' . esc_html__('Current Stock', 'woocommerce') . '</th>';
        echo '<th>' . esc_html__('Low Stock Threshold', 'woocommerce') . '</th>';
        echo '</tr></thead>';
        echo '<tbody>';

        if ($low_stock_result['status'] && $low_stock_products) {
            foreach ($low_stock_products as $product) {
                echo '<tr>';
                echo '<td><a href="' . get_edit_post_link($product->ID) . '">' . esc_html($product->post_title) . '</a></td>';
                echo '<td>' . esc_html($product->stock_qty) . '</td>';
                echo '<td>' . esc_html($product->low_stock_threshold) . '</td>';
                echo '</tr>';
            }
        } else {
            echo '<tr><td colspan="3" style="text-align: center;">' . esc_html__('No low stock products found.', 'woocommerce') . '</td></tr>';
        }

        echo '</tbody>';
        echo '</table>';

        // Display the total stock price
        $total_stock_price_html = '<h4 style="margin: 0 4px;">Total Stock Price: ' . wc_price($low_stock_result['data']['total_stock_price'] ?? 0) . '</h4>';

        $current_page = max(1, $paged);
        custom_pagination_format($total_products, $total_pages, $current_page, $total_stock_price_html);

        echo '</div>';
    }

    /**
     * Function to handle CSV download
     * @return void
     */
    public function download_low_stock_csv() {
        if (isset($_GET['download_csv']) && $_GET['download_csv'] === 'true') {
            // Retrieve all products (no pagination)
            $low_stock_result = paginate_low_stock_products(-1);

            if ($low_stock_result['status']) {
                $low_stock_products = $low_stock_result['data']['products'];

                // Create CSV content
                $csv_content = "Product Title,Current Stock,Low Stock Threshold\n";
                foreach ($low_stock_products as $product) {
                    $csv_content .= '"' . esc_html($product->post_title) . '",';
                    $csv_content .= '"' . esc_html($product->stock_qty) . '",';
                    $csv_content .= '"' . esc_html($product->low_stock_threshold) . '"' . "\n";
                }

                // Output CSV to download
                header('Content-Type: text/csv');
                header('Content-Disposition: attachment;filename=low-stock-products.csv');
                echo $csv_content;
                exit;
            }
        }
    }

}