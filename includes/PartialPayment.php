<?php

namespace WeDevs\WePOS;

/**
 * Partial Payment class
 */
class PartialPayment
{

	public function __construct()
	{

		$this->init_hooks();
	}

	/**
	 * Init hooks method.
	 *
	 * @return void
	 */
	public function init_hooks()
	{
		add_filter(get_hpos_hook_names('manage_edit-shop_order_columns'), [$this, 'add_order_due_amount_column']);
		add_action(get_hpos_hook_names('manage_shop_order_posts_custom_column'), [$this, 'render_order_due_amount_content'], 10, 2);
		add_filter(get_hpos_hook_names('bulk_actions-edit-shop_order'), [$this, 'add_partial_payment_bulk_action'], 20, 1);
		add_filter(get_hpos_hook_names('handle_bulk_actions-edit-shop_order'), [$this, 'handle_partial_payment_bulk_action'], 10, 3);

		add_action('admin_print_styles', [$this, 'add_order_due_amount_column_style']);
		add_action('init', [$this, 'register_partial_payment_order_status'], 11);
		add_filter('wc_order_statuses', [$this, 'add_partial_payment_to_order_statuses']);

		add_action('admin_notices', [$this, 'partial_payment_bulk_action_admin_notice']);
		add_filter('woocommerce_admin_order_actions', [$this, 'add_actions_button_on_partial_order_status'], 100, 2);

		add_action('woocommerce_admin_order_totals_after_total', [$this, 'due_amount_on_order_details']);

		add_action('admin_enqueue_scripts', [$this, 'wepos_partial_payment_enqueue_scripts']);

		add_action('init', [$this, 'add_view_order_capability'], 11);
		add_action('add_meta_boxes', [$this, 'add_partial_payment_meta_box'], 10, 2);
		add_filter('woocommerce_reports_order_statuses', [$this, 'append_partial_order_post_status'], 20, 1);
        add_filter( 'woocommerce_order_is_paid_statuses', [$this, 'append_partial_order_post_status']);
        add_action('woocommerce_order_status_partial', [$this, 'partial_reduce_stock_levels']);

        // pdf upload
        add_filter('upload_mimes', [$this,'allow_pdf_uploads']);
        add_action('wp', [$this,'my_custom_cron_schedule']);
        add_action('delete_old_receipt_pdfs', [$this,'delete_old_receipt_pdfs']);

        // order refunded
        add_action( 'woocommerce_order_refunded', [$this,'partial_action_on_order_refund'], 10, 2 );

    }

    public function partial_action_on_order_refund( $order_id, $refund_id )
    {
        $refund = wc_get_order( $refund_id );
        $refund_amount = $refund->get_amount();
        insert_partial_payment_stat($order_id, 0, $refund_amount);

    }

    /**
     * reduce stock levels after partial payment
     * @param $order_id
     */
    public function partial_reduce_stock_levels($order_id){
        wc_reduce_stock_levels($order_id);
    }


	/**
	 * Register the partial payment meta box
	 */
	public function add_partial_payment_meta_box($base, $order)
	{

		if (!is_current_user_admin() || (is_admin() && (!in_array(get_current_screen()->base, ['woocommerce_page_wc-orders', 'post']) || get_current_screen()->post_type !== 'shop_order'))) {
			return;
		}
		$screen = admin_shop_order_screen();

		$order = wc_get_order($order);

        $paid = get_total_paid_query($order->get_id());
        $due = $order->get_remaining_refund_amount() - $paid;
        $due = (float)number_format($due, 2, '.', '');

        if ($order && $order->get_status() === 'partial' && $due > 0) {
			add_meta_box(
				'partial_payment_meta_box',
				'Pay The Due Amount',
				array($this, 'add_partial_payment_input_field'),
				$screen,
				'side',
			);
		}

		add_meta_box(
			'partial_payment_stats_meta_box',
			'Order Partial Payment Statistics',
			array($this, 'order_partial_payment_stats'),
			$screen,
			'normal',
		);
	}

	/**
	 * Add order partial payment stats
	 * @param $order
	 * @return void
	 */
	public function order_partial_payment_stats($order)
	{
		$order = wc_get_order($order);
		$order_id = $order->get_id();
		$partial_payment_stats = get_partial_payment_stats($order_id);
		$total_paid = get_total_paid($partial_payment_stats);
		$total_amount = $order->get_total();
        $total_refund = $order->get_total_refunded();

        wp_localize_script('partial-payment-stats', 'partialPaymentData', array(
            'settings' => get_wepos_settings(),
            'orderId' => $order_id,
            'partialPaymentStats' => $partial_payment_stats,
            'dateFormat' => get_option('date_format'),
        ));

		?>
        <fieldset>
			<?php echo !is_admin() ? '<legend>Order Partial Payment Statistics</legend>' : ''; ?>
            <table class="wp-list-table widefat fixed striped partial-payment-stats">
                <thead>
                <tr>
                    <th class="manage-column partial-column-id"><?php esc_html_e('ID', 'wepos'); ?></th>
                    <th class="manage-column partial-column-paid-amount"><?php esc_html_e('Paid Amount', 'wepos'); ?></th>
                    <th class="manage-column partial-column-total-refund"><?php esc_html_e('Total Refund', 'wepos'); ?></th>
                    <th class="manage-column partial-column-total-due"><?php esc_html_e('Total Due', 'wepos'); ?></th>
                    <th class="manage-column partial-column-created-date"><?php esc_html_e('Created Date', 'wepos'); ?></th>
                    <th class="manage-column partial-column-receipt" style="text-align: center;"><?php esc_html_e('Actions', 'wepos'); ?></th>
                </tr>
                </thead>
                <tbody>
				<?php if (!empty($partial_payment_stats)): ?>
					<?php foreach ($partial_payment_stats as $stat):
						$due = $total_amount - $total_paid - $total_refund;
						?>
                        <tr>
                            <td class="partial-column-id"><?php echo esc_html($stat->ID); ?></td>
                            <td class="partial-column-paid-amount"><?php echo wc_price($stat->paid); ?></td>
                            <td class="partial-column-total-due"><?php echo wc_price($stat->refund??0); ?></td>
                            <td class="partial-column-total-due"><?php echo wc_price($due > 0 ? $due : 0); ?></td>
                            <td class="partial-column-created-date">
								<?php echo esc_html(date_i18n(get_option('date_format') ?? 'Y-m-d', strtotime($stat->date_created))); ?>
                            </td>
                            <td class="partial-column-receipt" style="text-align: center;">
                                <span id="generating-receipt" style="display: none">
                                    <button class="woocommerce-Button button" disabled> Generating Receipt...</button>
                                </span>
                                <span id="receipt-actions">
                                <a class="partial-receipt text-primary" href="#" data-date-partial-paid="<?php echo date_i18n(get_option('date_format') ?? 'Y-m-d', strtotime($stat->date_created)); ?>"
                                   data-partial-paid="<?php echo $total_paid; ?>" data-partial-paid-amount="<?php echo $stat->paid; ?>" data-partial-refund="<?php echo $stat->refund??0; ?>"
                                   data-partial-total-refund="<?php echo $total_refund; ?>"
                                   data-partial-due="<?php echo $due > 0 ? $due : 0; ?>" data-partial-payment-id="<?php echo $stat->ID; ?>" data-action-type="generate-receipt"><span class="dashicons dashicons-media-document"></span></a>

                                <a class="partial-receipt text-success" href="#" data-date-partial-paid="<?php echo date_i18n(get_option('date_format') ?? 'Y-m-d', strtotime($stat->date_created)); ?>"
                                   data-partial-paid="<?php echo $total_paid; ?>" data-partial-paid-amount="<?php echo $stat->paid; ?>"
                                   data-partial-refund="<?php echo $stat->refund??0; ?>"
                                   data-partial-total-refund="<?php echo $total_refund; ?>"
                                   data-partial-due="<?php echo $due > 0 ? $due : 0; ?>" data-partial-payment-id="<?php echo $stat->ID; ?>" data-action-type="share-whatsapp"><span class="dashicons dashicons-whatsapp"></span></a>

                                <a class="partial-receipt text-info" href="#" data-date-partial-paid="<?php echo date_i18n(get_option('date_format') ?? 'Y-m-d', strtotime($stat->date_created)); ?>"
                                   data-partial-paid="<?php echo $total_paid; ?>" data-partial-paid-amount="<?php echo $stat->paid; ?>"
                                   data-partial-refund="<?php echo $stat->refund??0; ?>"
                                   data-partial-total-refund="<?php echo $total_refund; ?>"
                                   data-partial-due="<?php echo $due > 0 ? $due : 0; ?>" data-partial-payment-id="<?php echo $stat->ID; ?>" data-action-type="share-email"><span class="dashicons dashicons-email-alt"></span></a>
                                </span>
                            </td>
                        </tr>
						<?php $total_paid -= $stat->paid;
                        $total_refund -= $stat->refund
                        ?>
					<?php endforeach; ?>
				<?php else: ?>
                    <tr>
                        <td colspan="6" style="text-align: center;"><?php esc_html_e('No partial payment records found.', 'wepos'); ?></td>
                    </tr>
				<?php endif; ?>
                </tbody>
            </table>
        </fieldset>
        <div id="receipt-print-container" style="display:none;"></div>
        <?php
	}


	/**
	 * Add order due amount, paid amount in order details
	 * @param $orderData
	 *
	 * @return void
	 */
	public function due_amount_on_order_details($orderData)
	{
		$order = wc_get_order($orderData);
		$paid = get_total_paid_query($order->get_id());


		$due = $order->get_meta('_wepos_cash_payment_type') === 'partial' ? $order->get_remaining_refund_amount() - $paid : 0;
        $paid = $order->get_remaining_refund_amount() >= $paid  ? $paid : $order->get_remaining_refund_amount();

		$html = '<tfoot>';
		if ($due > 0) {
			$html .= '<tr><th class="label" scope="row">Due:</th>' . (is_int($orderData) ? '<td width="1%"></td>' : '') . '<td class="total">' . wc_price($due) . '</td></tr>';
		}

		if ($paid && $order->get_meta('_wepos_cash_payment_type') === 'partial') {
			$html .= '<tr><th class="label" scope="row">Paid:</th>' . (is_int($orderData) ? '<td width="1%"></td>' : '') . '<td class="total">' . wc_price($paid) . '</td></tr>';
		}

		$html .= '</tfoot>';
		echo $html;
	}

	/**
	 * Append partial order post status
	 * @param $statuses
	 *
	 * @return string[]
     */
	public function append_partial_order_post_status($statuses)
	{
		if (!is_array($statuses)) {
			return array('completed', 'processing', 'on-hold', 'partial');
		}
		$statuses[] = 'partial';
		return $statuses;
	}

	/**
	 * Add actions button on partial order status
	 * @param $actions
	 * @param $order
	 *
	 * @return mixed
	 */
	public function add_actions_button_on_partial_order_status($actions, $order)
	{
		if ($order->has_status('partial')) {
			$actions['processing'] = [
				'url' => wp_nonce_url(admin_url('admin-ajax.php?action=woocommerce_mark_order_status&status=processing&order_id=' . $order->get_id()), 'woocommerce-mark-order-status'),
				'name' => __('Processing', 'woocommerce'),
				'action' => 'processing',
			];

			$actions['complete'] = [
				'url' => wp_nonce_url(admin_url('admin-ajax.php?action=woocommerce_mark_order_status&status=completed&order_id=' . $order->get_id()), 'woocommerce-mark-order-status'),
				'name' => __('Complete', 'woocommerce'),
				'action' => 'complete',
			];
		}

		return $actions;
	}

	/**
	 * Add order due column in order list
	 * @param $defaults
	 *
	 * @return array
	 */
	public function add_order_due_amount_column($defaults)
	{
		$columns = [];
		foreach ($defaults as $column_name => $column_info) {
			$columns[$column_name] = $column_info;
            // Due amount
			if ('order_total' === $column_name) {
				$columns['order_due_amount'] = apply_filters('wepos_order_due_amount_column_title', __('Due Amount', 'partial-payment'));
			}
		}

        // Vendor type
        $columns['vendor_type'] = apply_filters('wepos_order_vendor_type_column_title', __('Vendor Type', 'wepos'));

		return $columns;
	}

	/**
	 * Render order due amount in order list
	 * @param $column_name
	 * @param $post_id
	 *
	 * @return void
	 */
	public function render_order_due_amount_content($column_name, $post_id)
	{
        $order = wc_get_order($post_id);
        // Due amount
		if ('order_due_amount' === $column_name) {
			$paid = get_total_paid_query($order->get_id());
			$due = $order->get_meta('_wepos_cash_payment_type') === 'partial' ? $order->get_remaining_refund_amount() - $paid : 0;

			$currency = is_callable([$order, 'get_currency']) ? $order->get_currency() : $order->order_currency;

			echo wc_price($due > 0 ? $due : 0, ['currency' => $currency]);
		}

        // Vendor type
        if ('vendor_type' === $column_name) {
            echo ucfirst($order->get_meta('_wepos_vendor_type')) ?: 'Regular';
        }
	}

	/**
	 * Add style for order due amount column
	 * @return void
	 */
	public function add_order_due_amount_column_style()
	{
		$css = '.widefat .column-order_due_amount, .widefat .column-order_due_amount, .widefat .column-vendor_type { width: 9% !important; text-align: center; } .order-status.status-partial {
                background: #ffeb3b;
                color: #000;
            } .partial-column-id, .partial-column-paid-amount, .partial-column-total-due,
            .partial-column-total-refund, .partial-column-created-date, .partial-column-receipt {width: 9% !important;} ';
		wp_add_inline_style('woocommerce_admin_styles', $css);
	}

	/**
	 * Register partial payment order status in wooCommerce order status
	 * @return void
	 */
	public function register_partial_payment_order_status()
	{
		register_post_status('wc-partial', [
			'label' => _x('Partially Paid', 'Order status', 'woocommerce'),
			'public' => true,
			'exclude_from_search' => false,
			'show_in_admin_all_list' => true,
			'show_in_admin_status_list' => true,
			'label_count' => _n_noop('Partially Paid <span class="count">(%s)</span>', 'Partially Paid <span class="count">(%s)</span>'),
		]);
	}

	/**
	 * Add partial payment to order statuses
	 * @param $order_statuses
	 *
	 * @return array
	 */
	public function add_partial_payment_to_order_statuses($order_statuses)
	{
		$new_statuses = [];
		foreach ($order_statuses as $id => $label) {
			if ('wc-completed' === $id) {
				$new_statuses['wc-partial'] = _x('Partially Paid', 'Order status', 'woocommerce');
			}

			$new_statuses[$id] = $label;
		}

		return $new_statuses;
	}

	/**
	 * Add partial payment bulk action
	 * @param $bulk_actions
	 *
	 * @return mixed
	 */
	public function add_partial_payment_bulk_action($bulk_actions)
	{
		$bulk_actions['mark_partial_payment'] = 'Change Status to Partially Paid';
		return $bulk_actions;
	}

	/**
	 * Handle partial payment bulk action
	 * @param $redirect_to
	 * @param $do_action
	 * @param $post_ids
	 *
	 * @return mixed|string
	 */
	public function handle_partial_payment_bulk_action($redirect_to, $do_action, $post_ids)
	{
		if ('mark_partial_payment' !== $do_action) {
			return $redirect_to;
		}

		foreach ($post_ids as $post_id) {
			$order = wc_get_order($post_id);
			$order->update_status('partial');
		}

		return add_query_arg('bulk_mark_partial_payment', count($post_ids), $redirect_to);
	}

	/**
	 * Partial payment bulk action on admin notice
	 * @return void
	 */
	public function partial_payment_bulk_action_admin_notice()
	{
		if (!empty($_REQUEST['bulk_mark_partial_payment'])) {
			$count = (int) $_REQUEST['bulk_mark_partial_payment'];
			printf(
				'<div id="message" class="updated fade">' .
				_n('%s order status changed to Partial Payment.', '%s order statuses changed to Partial Payment.', $count, 'woocommerce') . '</div>',
				$count
			);
		}
	}

	/**
	 * Add partial payment input field
	 * @param $order
	 *
	 * @return void
	 */
	public function add_partial_payment_input_field($order)
	{
		$order = wc_get_order($order);
		// Check if the order exists and is in 'partial' status
		if (!$order || $order->get_status() !== 'partial') {
			return;
		}

		// Check if the current user is an admin
		if (!current_user_can('manage_woocommerce')) {
			return;
		}

		// Get order ID
		$order_id = $order->get_id();

		// Calculate due amount
		$paid = get_total_paid_query($order_id);
		$due = $order->get_remaining_refund_amount() - $paid;
        $due = (float)number_format($due, 2, '.', '');

		// Output the input field
		echo '<div id="woocommerce-form-partial-payment">
        <fieldset>
          <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                <label for="partial_payment_amount">Partial Payment Amount</label>
                <input class="woocommerce-Input woocommerce-Input--number input-number" type="number" step="0.01" min="1" max="' . esc_attr($due) . '" id="partial_payment_amount" name="partial_amount" value="' . esc_attr($due) . '" />
            </p>
            <p class="form-row form-row-wide">
                <input type="hidden" id="partial_payment_id" name="order_id" value="' . esc_attr($order_id) . '" />
                <input type="hidden" id="partial-payment-nonce" name="partial-payment-nonce" value="' . esc_attr(wp_create_nonce('wp_rest')) . '">
                <button id="update_partial_payment_button" class="woocommerce-Button button">Process Payment</button>
            </p>
        </fieldset>
    </div>';
	}

	/**
	 * Enqueue partial payment script
	 * @return void
	 */
	public function wepos_partial_payment_enqueue_scripts()
	{

		if (!is_current_user_admin() || (is_admin() && (!in_array(get_current_screen()->base, ['woocommerce_page_wc-orders', 'post']) || get_current_screen()->post_type !== 'shop_order'))) {
			return;
		}

		// Enqueue your script
        wp_enqueue_script('jspdf', plugins_url('../assets/js/jspdf.umd.min.js', __FILE__), array(), '2.5.1', true);
		wp_enqueue_script('wepos-partial-payment-script', plugins_url('../assets/js/partialPayment' . (VUE_BUILD_MODE ? '' : '.min') . '.js', __FILE__), array('jquery'), null, true);
        wp_enqueue_script('partial-payment-stats', plugins_url('../assets/js/partialPaymentStatsReceipt' . (VUE_BUILD_MODE ? '' : '.min') . '.js', __FILE__), array('jquery', 'jspdf'), '1.0', true);

        wp_localize_script('partial-payment-stats', 'weposData', array(
            'orderUrl' => esc_url_raw(rest_url('wc/v3/orders')),
            'mediaUrl' => esc_url_raw(rest_url('wp/v2/media')),
            'nonce' => wp_create_nonce('wp_rest'),
        ));

		wp_localize_script(
			'wepos-partial-payment-script',
			'restApiSettings',
			array(
				'restUrl' => esc_url_raw(rest_url('wepos/v1/partial-payment/update')),
				'nonce' => wp_create_nonce('wp_rest'),
			)
		);

	}

    /**
     * @param $mimes
     * @return mixed
     */
    public function allow_pdf_uploads($mimes) {
        $mimes['pdf'] = 'application/pdf';
        return $mimes;
    }


	/**
	 * Add view order capability to administrator
	 * @return void
	 */
	public function add_view_order_capability()
	{
		$role = get_role('administrator');
		$role->add_cap('view_order', true);
	}

    /**
     * @return void
     */
    public function my_custom_cron_schedule() {
        if (!wp_next_scheduled('delete_old_receipt_pdfs')) {
            wp_schedule_event(time(), 'daily', 'delete_old_receipt_pdfs');
        }
    }

    public function delete_old_receipt_pdfs() {
        $args = array(
            'post_type'      => 'attachment',
            'post_mime_type' => 'application/pdf',
            'date_query'     => array(
                array(
                    'column' => 'post_date',
                    'before' => '20 days ago',
                ),
            ),
            'posts_per_page' => -1,
        );

        // Fetch all PDFs older than 20 days
        $attachments = get_posts($args);

        foreach ($attachments as $attachment) {
            $file_name = basename(get_attached_file($attachment->ID)); // Get the file name

            // Check if the file name starts with 'receipt-order-'
            if (strpos($file_name, 'receipt-order-') === 0) {
                wp_delete_attachment($attachment->ID, true); // Delete the PDF
            }
        }
    }




}
