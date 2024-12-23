<?php

namespace WeDevs\WePOS;

use WC_Customer;

class CustomManager {
	/**
	 * Constructor - Adds all necessary hooks and filters
	 */
	public function __construct() {
		// Add the NIF field to billing fields in the checkout
		add_filter( 'woocommerce_billing_fields', [$this, 'add_billing_fields'], 10 );

		// Add the NIF field to the WooCommerce admin order page
		add_filter( 'woocommerce_admin_billing_fields', [$this, 'add_admin_billing_fields']);

		// Initialize admin AJAX for customer details
		add_action( 'admin_init', [$this, 'init_admin_ajax_customer_details'] );

		// Add the NIF field to customer meta fields in the WooCommerce admin
		add_action( 'woocommerce_customer_meta_fields', [$this, 'add_customer_meta_fields']  );

		// Display the NIF in order details on the frontend
		add_action( 'woocommerce_order_details_after_customer_details', [$this, 'display_order_details_after_customer']);

		// Add the NIF field to WooCommerce emails
		add_filter( 'woocommerce_email_customer_details_fields', [$this, 'add_nif_to_email'] , 10, 3 );

		// Extend the WooCommerce REST customer schema to include NIF
		add_filter( 'woocommerce_rest_customer_schema', [$this, 'extend_rest_customer_schema'], 8, 1 );

		// Validate NIF during checkout
		add_action( 'woocommerce_checkout_process', [$this, 'validate_nif_checkout'] );

		// Validate NIF when saving the billing address
		add_action( 'woocommerce_after_save_address_validation', [$this, 'validate_nif_save_address'] , 10, 3 );

		add_action('user_register', [$this,'add_customer_nif']);

		add_filter('woocommerce_rest_prepare_customer', [$this,'add_nif_to_customer_response'], 10, 3);
		add_filter('woocommerce_rest_prepare_shop_order_object', [$this,'add_nif_to_order_response'], 10, 2);
		add_action('woocommerce_rest_insert_customer', [$this,'save_nif_from_request'], 10, 2);
		add_filter('woocommerce_rest_customer_query', [$this,'search_customers_by_search_by_data'], 8, 2);

        // Add custom product price fields
        add_action( 'woocommerce_product_options_pricing', [$this,'add_custom_product_price_fields'] );
        add_action( 'woocommerce_process_product_meta', [$this, 'save_custom_product_price_fields']);
        add_filter('woocommerce_rest_prepare_product_object', [$this,'add_local_and_export_prices_to_api_response'], 10, 3);
        add_action('woocommerce_rest_pre_insert_shop_order_object', [$this, 'adjust_price_based_on_vendor_type'], 10, 3);
        add_filter('gettext', [$this,'custom_order_details_title'], 20);
        add_filter('ngettext', [$this,'custom_order_details_title'], 20);
	}

    public function custom_order_details_title($translated_text) {
        global $pagenow, $post;
        if ($pagenow === 'post.php' && isset($post->ID) && $translated_text === '%1$s #%2$s details' && get_post_type($post->ID) === 'shop_order') {

            $order = wc_get_order($post->ID);
            $vendor = $order->get_meta('_wepos_vendor_type') ?: 'regular';
            $translated_text = '%1$s #%2$s details ('.$vendor.')';

        }
        return $translated_text;
    }


	/**
	 * Add the NIF field to the WooCommerce checkout billing fields.
	 *
	 * @param array $fields Billing fields.
	 * @return array Modified billing fields.
	 */
	public function add_billing_fields( $fields) {
		$fields['billing_nif'] = array(
			'type'         => 'text',
			'label'        => $this->field_label(),
			'placeholder'  => apply_filters( 'woocommerce_nif_field_placeholder', __( 'Portuguese VAT identification number', 'wepos' ) ),
			'class'        => apply_filters( 'woocommerce_nif_field_class', array( 'form-row-first' ) ),
			'required'     =>  false,
			'clear'        => apply_filters( 'woocommerce_nif_field_clear', true ),
			'autocomplete' => apply_filters( 'woocommerce_nif_field_autocomplete', 'on' ),
			'priority'     => apply_filters( 'woocommerce_nif_field_priority', 120 ),
			'maxlength'    => $this->field_maxlength(),
			'validate'     => $this->field_validate() ? array( 'nif_pt' ) : false,
		);
		return $fields;
	}

	/**
	 * Add the NIF field to the WooCommerce admin order billing fields.
	 *
	 * @param array $billing_fields Billing fields.
	 * @return array Modified billing fields.
	 */
	public function add_admin_billing_fields( $billing_fields ) {

        $billing_fields['nif'] = array( 'label' => $this->field_label() );

		return $billing_fields;
	}

	/**
	 * Initialize AJAX hook to include NIF in customer details in the admin area.
	 */
	public function init_admin_ajax_customer_details() {
		add_filter( 'woocommerce_ajax_get_customer_details', array( $this, 'ajax_get_customer_details' ), 10, 2 );
	}

	/**
	 * Include the NIF in the customer details when retrieved via AJAX in the admin area.
	 *
	 * @param array $customer_data Customer data.
	 * @param object $customer WooCommerce customer object.
	 *
	 * @return array Modified customer data.
	 */
	public function ajax_get_customer_details( $customer_data, $customer ) {

        $customer_data['billing']['nif'] = $customer->get_meta( 'billing_nif' );

		return $customer_data;
	}

	/**
	 * Add the NIF field to the WooCommerce customer meta fields in the admin area.
	 *
	 * @param array $show_fields Fields to be displayed in the customer meta section.
	 * @return array Modified customer meta fields.
	 */
	public function add_customer_meta_fields( $show_fields ) {
		if ( isset( $show_fields['billing'] ) && is_array( $show_fields['billing']['fields'] ) ) {
			$show_fields['billing']['fields']['billing_nif'] = array(
				'label' => $this->field_label(),
				'description' => '',
			);
		}
		return $show_fields;
	}

	/**
	 * Display the NIF in the order details section on the frontend.
	 *
	 * @param WC_Order $order WooCommerce order object.
	 */
	public function display_order_details_after_customer( $order ) {
		$nif = $order->get_meta( 'billing_nif' );
		if ( ! empty( $nif ) ) {
			?>
			<p><strong><?php echo esc_html( $this->field_label() ); ?>:</strong> <?php echo esc_html( $nif ); ?></p>
			<?php
		}
	}

	/**
	 * Add the NIF to WooCommerce emails sent to the customer.
	 *
	 * @param array $fields Customer details fields.
	 * @param bool $sent_to_admin If the email is sent to admin.
	 * @param WC_Order $order WooCommerce order object.
	 * @return array Modified customer details fields.
	 */
	public function add_nif_to_email( $fields, $sent_to_admin, $order ) {
		$nif = $order->get_meta( 'billing_nif' );
		if ( ! empty( $nif )) {
			$fields['nif'] = array(
				'label' => $this->field_label(),
				'value' => $nif,
			);
		}
		return $fields;
	}

	/**
	 * Add the NIF to WooCommerce API order responses.
	 *
	 * @param array $response API response.
	 * @param WC_Order $order WooCommerce order object.
	 *
	 * @return array Modified API response.
	 * @throws \Exception
	 */
	public function add_nif_to_order_response( $response, $order ) {
		$customer = new WC_Customer( $order->get_customer_id() );
		// Get existing data from the response object
		$data = $response->get_data();
		// Add NIF to the response data
		$data['billing']['nif'] = $customer->get_meta('billing_nif');

		// Set the modified data back to the response object
		$response->set_data($data);
		return $response;
	}

	/**
	 * Add the NIF to WooCommerce API customer responses.
	 *
	 * @param array $response API response.
	 * @param WP_User $user WordPress user object.
	 *
	 * @return array Modified API response.
	 * @throws \Exception
	 */
	public function add_nif_to_customer_response( $response, $user ) {
		$customer = method_exists($user, 'get_id')? $user : new WC_Customer( $user->ID );

		// Get existing data from the response object
		$data = $response->get_data();
		// Add NIF to the response data
		$data['billing']['nif'] = $customer->get_meta('billing_nif');

		// Set the modified data back to the response object
		$response->set_data($data);
		return $response;
	}

	/**
	 * Extend the WooCommerce REST API customer schema to include the NIF field.
	 *
	 * @param array $schema The schema to be extended.
	 * @return array Modified customer schema.
	 */
	public function extend_rest_customer_schema( $schema ) {
		$schema['properties']['billing']['properties']['nif'] = array(
			'description' => $this->field_label(),
			'type'        => 'string',
			'context'     => array( 'view', 'edit' ),
		);
		return $schema;
	}

	/**
	 * Validate the NIF during WooCommerce checkout.
	 */
	public function validate_nif_checkout() {

			$nif = isset( $_POST['billing_nif'] ) ? wc_clean( $_POST['billing_nif'] ) : '';

			if ( $nif && ! $this->is_valid_nif( $nif ) ) {
				wc_add_notice( apply_filters( 'woocommerce_nif_validation_error', __( 'Please enter a valid NIF.', 'wepos' ) ), 'error' );
			}
	}

	/**
	 * Validate the NIF when saving the billing address.
	 *
	 * @param int $user_id User ID.
	 * @param string $load_address Address type being saved.
	 * @param array $address Address data.
	 */
	public function validate_nif_save_address( $user_id, $load_address, $address ) {
		if ( ! empty( $address['billing_nif'] ) && $this->field_validate() ) {
            $nif = wc_clean( $address['billing_nif'] );
            if ( ! $this->is_valid_nif( $nif ) ) {
                wc_add_notice( apply_filters( 'woocommerce_nif_validation_error', __( 'Please enter a valid NIF.', 'wepos' ) ), 'error' );
            }
        }
	}

	/**
	 * Get the label for the NIF field.
	 *
	 * @return string The NIF field label.
	 */
	public function field_label() {
		return apply_filters( 'woocommerce_nif_field_label', __( 'NIF', 'wepos' ) );
	}

	/**
	 * Determine if the NIF should be validated.
	 *
	 * @return bool Whether the NIF should be validated.
	 */
	public function field_validate() {
		return apply_filters( 'woocommerce_nif_field_validate', true );
	}

	/**
	 * Get the maximum length of the NIF field.
	 *
	 * @return int The maximum length of the NIF.
	 */
	public function field_maxlength() {
		return apply_filters( 'woocommerce_nif_field_maxlength', 9 );
	}

	/**
	 * Validate the format of the NIF.
	 *
	 * @param string $nif The NIF to validate.
	 * @return bool Whether the NIF is valid.
	 */
	public function is_valid_nif( $nif ) {
		// NIF must be numeric and 9 digits long
		if ( ! is_numeric( $nif ) || strlen( $nif ) !== 9 ) {
			return false;
		}

		// Calculate the check digit
		$check_digit = 0;
		for ( $i = 0; $i < 8; $i++ ) {
			$check_digit += $nif[$i] * (10 - $i - 1);
		}

		$check_digit = 11 - ( $check_digit % 11 );

		if ( $check_digit >= 10 ) {
			$check_digit = 0;
		}

		// Return whether the calculated check digit matches the provided check digit
		return $check_digit === $nif[8];
	}

	/**
     * Add the NIF to the customer.
	 * @param $customer_id
	 *
	 * @return void
	 */
	public function add_customer_nif($customer_id) {
        if(isset($_POST['billing']['nif'])) {
            update_user_meta($customer_id, 'billing_nif', sanitize_text_field($_POST['billing']['nif']));
        }
	}

    /**
     * Save the NIF from the request.
     *
     * @param object $customer Customer object.
     * @param array $request Request data.
     * @return void
     */
	public function save_nif_from_request($customer, $request) {
		if (isset($request['billing']['nif'])) {
			update_user_meta($customer->get_id(), 'billing_nif', sanitize_text_field($request['billing']['nif']));
		}
	}

	/**
     * Search customers by NIF, Id or default.
	 * @param $args
	 * @param $request
	 *
	 * @return array
	 */
    public function search_customers_by_search_by_data($args, $request) {
        if (!empty($request['search']) && !empty($request['search_by'])) {

            $search_term = sanitize_text_field($request['search']);
            $search_by = sanitize_text_field($request['search_by']);

            $meta_key = $search_by === 'nif' ? 'billing_nif' :  null;
            $meta_key =  $search_by === 'address' ? 'billing_address_1' : $meta_key;

            if ($meta_key) {
                $args['meta_query'][] = ['key' => $meta_key, 'value' => $search_term, 'compare' => 'LIKE'];
                unset($args['search']);
            }
        }
        return $args;
    }

    // Add custom price fields to product edit page
    public function add_custom_product_price_fields() {
        woocommerce_wp_text_input( array(
            'id' => '_local_price',
            'label' => __('Local Price ('. get_woocommerce_currency_symbol(). ')', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the local price for this product.', 'woocommerce'),
            'type' => 'text',
            'class' => 'short wc_input_price',
        ));

        woocommerce_wp_text_input( array(
            'id' => '_export_price',
            'label' => __('Export Price ('. get_woocommerce_currency_symbol(). ')', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the export price for this product.', 'woocommerce'),
            'type' => 'text',
            'class' => 'short wc_input_price',
        ));
    }

    // Save custom price fields
    public function save_custom_product_price_fields( $post_id ) {
        $local_price = isset($_POST['_local_price']) ? sanitize_text_field($_POST['_local_price']) : '';
        update_post_meta($post_id, '_local_price', esc_attr($local_price));

        $export_price = isset($_POST['_export_price']) ? sanitize_text_field($_POST['_export_price']) : '';
        update_post_meta($post_id, '_export_price', esc_attr($export_price));
    }

    /**
     * Add local and export prices to API response
     * @param array $response API response.
     * @param WC_Product $product Product object.
     */
    public function add_local_and_export_prices_to_api_response($response, $product, $request) {
        // Get the custom fields
        $local_price = $product->get_meta('_local_price', true);
        $export_price = $product->get_meta( '_export_price', true);

        // Add custom fields to the response data
        $response->data['vendor_type'] = $request['vendor_type'] ?? 'regular';
        $response->data['local_price'] = trim(!empty($local_price) ?
            number_format((float)str_replace(',', '.', $local_price), 2, '.', '')
            : '');
        $response->data['local_display_price'] = $response->data['local_price'];
        $response->data['export_price'] = trim(!empty($export_price) ?
            number_format((float)str_replace(',', '.', $export_price), 2, '.', '')
            : '');
        $response->data['export_display_price'] = $response->data['export_price'];


        if(isset($request['vendor_type']) && in_array($request['vendor_type'], ['local', 'export'])) {
           $price = $request['vendor_type'] === 'local' ? $response->data['local_price'] : $response->data['export_price'];

            $response->data['price'] = !empty($price) ? $price : $response->data['price'];
            $response->data['price_html'] = wc_price($response->data['price']);
        }

        return $response;
    }


    /**
     * Adjust prices based on vendor type
     * @param $order
     * @param $request
     * @param $creating
     * @return mixed
     */
    public function adjust_price_based_on_vendor_type($order, $request, $creating) {

        if (!$creating) {
            return $order;
        }

        $request_items = $request['line_items'] ?? [];

        foreach ($order->get_items() as $item) {
            $product_id = $item->get_product_id();
            $product = wc_get_product($product_id);
            $vendor = $order->get_meta('_wepos_vendor_type', true);
            $quantity = $item->get_quantity();

            // Find matching request item
            $request_item = array_filter($request_items, fn($ri) => isset($ri['product_id']) && (int)$ri['product_id'] === (int)$product_id);
            $request_item = $request_item ? array_shift($request_item) : null;

            if ($product && $request_item) {
                // Determine the appropriate meta key and request price based on vendor type
                $price_meta_key = $vendor === 'local' ? '_local_price' : ($vendor === 'export' ? '_export_price' : '_regular_price');
                $request_price_key = "{$vendor}_price";
                $base_price = get_post_meta($product_id, $price_meta_key, true);
                $request_price = $request_item[$request_price_key] ?? 0;

                $final_price = max((float)$base_price, (float)$request_price) * $quantity;
                if ($final_price) {
                    $item->set_subtotal($final_price);
                    $item->set_total($final_price);
                }
            }
        }

        return $order;
    }


}
