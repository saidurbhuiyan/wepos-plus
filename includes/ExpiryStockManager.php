<?php

namespace WeDevs\WePOS;

use DateTime;

class ExpiryStockManager
{
    public function __construct() {
        add_action('woocommerce_product_options_inventory_product_data', [$this, 'add_quantity_per_box_and_expiry_rule_fields']);
        add_action('woocommerce_process_product_meta', [$this, 'save_quantity_per_box_and_expiry_fields']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_scripts']);
	    // Admin Columns and Quick Edit
	    add_filter( 'manage_product_posts_columns', [$this, 'product_column_head'],11);
	    add_action( 'manage_product_posts_custom_column', [$this, 'product_column_content'], 10, 2);
        add_action('woocommerce_after_order_itemmeta', [$this, 'add_expiry_to_order_items'], 10, 2);
        add_filter("woocommerce_product_importer_parsed_data", [$this, 'format_expiry_meta_on_import']);
    }


    /**
     * format expiry meta on import
     * @param $data
     * @return array
     */
    public function format_expiry_meta_on_import($data) {
        // Check if 'meta_data' exists and is an array
        if (!isset($data["meta_data"]) || !is_array($data["meta_data"])) {
            return $data;
        }

        // Find the index of '_expiry_data' within 'meta_data'
        $expiryMetaKey = array_search('_expiry_data', array_column($data["meta_data"], 'key'), true);

        // If '_expiry_data' is found and its value is not empty, proceed to format it
        if ($expiryMetaKey !== false && !empty($data["meta_data"][$expiryMetaKey]['value'])) {
            $result = [];
            $expiryData = explode(",", $data["meta_data"][$expiryMetaKey]['value']);

            // Parse each expiry entry
            foreach ($expiryData as $index => $expiry) {
                // Split the expiry string into date, quantity, company, and buying_price
                $parts = explode('-', $expiry);
                if(count($parts) !== 4) {
                    continue;
                }

                $date = trim($parts[0]);
                $quantity = trim($parts[1]);
                $company = trim($parts[2]);
                $buying_price = trim($parts[3]);

                // Skip entries with empty date or quantity
                if(empty($date) || empty($quantity)) {
                    continue;
                }

                // Format the date to 'Y-m-d' if it's valid, otherwise skip this entry
                $formatted_date = DateTime::createFromFormat('d/m/Y', sanitize_text_field($date));
                if ($formatted_date === false) {
                    continue;
                }
                $date = $formatted_date->format('Y-m-d');

                // Store the formatted data
                $result[$index] = [
                    'date' => $date,
                    'quantity' => $quantity,
                    'company' => $company,
                    'buying_price' => $buying_price
                ];
            }

            // Update the '_expiry_data' value with the formatted result
            $data["meta_data"][$expiryMetaKey]['value'] = $result;

            // Append the '_expiry_rule' metadata
            $data["meta_data"][] = ['key' => '_expiry_rule', 'value' => 'yes'];
        }

        return $data;
    }



    /**
     * add expiry to order items
     * @param $itemId
     * @param $item
     * @return void
     */
    public function add_expiry_to_order_items($itemId, $item) {
        if (!method_exists($item, 'get_product_id')){
          return;
        }

        $productId = $item->get_product_id();
        $order = wc_get_order($item->get_order_id());

        $orderExpiry = $order->get_meta('_wepos_product_expiry_data');
        $orderExpiry = $orderExpiry ? array_filter($orderExpiry, static fn($item) => (int)$item['product_id'] === (int)$productId && !empty($item['expiry'])) : null;

        if(!$productId || !$orderExpiry){
            return;
        }

        $expiry = reset($orderExpiry)['expiry'];
        $date_format = get_option( 'date_format' );
        echo '<div class="view">
			<table cellspacing="0" class="display_meta">
							<tbody><tr>
					<th>Expiry:</th>
					</tr>
				
					<tr>
					<td>';

        foreach ($expiry as $data) {
            echo '<p> <span class="text-success">'.(isset($data['buying_price']) ? wc_price($data['buying_price'])  : 'NaN') .'</span> - '.$data['quantity'].'x '.date($date_format, strtotime($data['date'])).
            ' ( <span class="text-info">'.(!empty($expiry_date['company']) ? $expiry_date['company'] : 'NaN').'</span> )</p>';
        }


        echo '</td>
				</tr>
					</tbody></table>
	</div>';

    }
	
	/**
	 * Add Expiry Rule Field
	 **/
    public function add_quantity_per_box_and_expiry_rule_fields() {

        // Quantity Per Box Field
        $quantity_per_box = get_post_meta( get_the_ID(), '_quantity_per_box', true ) ?? 0;
        echo '<div class="options_group">';

        woocommerce_wp_text_input(
            [
                'id'                => '_quantity_per_box',
                'value'             =>  $quantity_per_box,
                'label'             => __( 'Quantity Per Box', 'woocommerce' ),
                'desc_tip'          => true,
                'description'       => __( 'Total quantity of product per box.', 'wepos' ),
                'type'              => 'number',
                'custom_attributes' => [
                    'step' => 'any',
                ],
            ]
        );

        echo '</div>';

        echo '<div class="options_group">';
        // Expiry alert duration Field
        $quantity_per_box = get_post_meta( get_the_ID(), '_expiry_alert_duration', true ) ?? 10;
        woocommerce_wp_text_input(
            [
                'id'                => '_expiry_alert_duration',
                'value'             =>  $quantity_per_box !== '' ? $quantity_per_box : 10,
                'label'             => __( 'Expiry Alert Duration (Days)', 'woocommerce' ),
                'desc_tip'          => true,
                'description'       => __( 'when the email alert will be sent before the expiry date is reached', 'wepos' ),
                'type'              => 'number',
                'custom_attributes' => [
                    'step' => 'any',
                ],
            ]
        );

        // Expiry Rule Field
        $expiry_dates = get_post_meta( get_the_ID(), '_expiry_data', true );
        $expiry_rule = get_post_meta( get_the_ID(), '_expiry_rule', true );
        $manage_stock = get_post_meta( get_the_ID(), '_manage_stock', true );
        // Expiry Rule Dropdown
        woocommerce_wp_select([
            'id' => '_expiry_rule',
            'label' => __('Expiry Rule', 'wepos'),
            'options' => [
                'no' => __('No', 'wepos'),
                'yes' => __('Yes', 'wepos'),
            ],
            'desc_tip' => true,
            'description' => __('If you choose expiry rule yes, manage stock will be enabled and quantity will be based on total expiry quantity.', 'wepos'),
            'value' => $manage_stock === 'yes' ? $expiry_rule : 'no',

        ]);


        // Placeholder for Expiry Date and Quantity Fields
        echo '<div id="expiry_date_fields" ' . ($expiry_rule === 'yes' && $manage_stock === 'yes' ? '' : 'style="display: none;"') . '>
       <table class="expiry-table">
       <thead>
       <tr class="expiry_label"> 
       <th>Expiry Date</th>
       <th>Quantity</th>
       <th>Company</th>
       <th>Buying Price</th>
       <th></th>
       </tr>
</thead>
        <tbody id="expiry_input">';

        if( $expiry_rule === 'yes' && is_array($expiry_dates) && count($expiry_dates) > 0):
            foreach ($expiry_dates as $index => $expiry_date):
                $buttonField = $index > 0 ? '<button type="button" class="remove-expiry-field">&times;</button>' : '<span style="padding: 0 14px;"></span>';
                echo '<tr class="form-field expiry-field-group">
<td>
                <input type="date" class="short" name="expiry_dates[]" id="expiry_dates_' . $index . '" value="' . $expiry_date['date'] . '">
                </td>
                <td>
                <input type="number" class="short" min="1" name="expiry_quantities[]" id="expiry_quantities_' . $index . '" value="' . $expiry_date['quantity'] . '">
                </td>
                <td><input type="text" class="short" name="expiry_company[]"  id="expiry_company_' . $index . '" value="' . ($expiry_date['company']?? '') .'">
                </td>
                <td>
                <input type="number" class="short" name="expiry_buying_price[]" min="0" step="0.01" id="expiry_buying_price_' . $index . '" value="' . ($expiry_date['buying_price']?? '0') . '">
                </td>
                <td>
                ' . $buttonField . '
                </td>
           </tr>';
            endforeach;
        endif;

        echo ' </tbody></table> <div class="form-field expiry_label_button">
            <button type="button" class="add-expiry-field button small-button">Add Expiry</button>
        </div>
        </div>
        </div>';

    }

    /**
     * Save Expiry Rule and Related Fields
     * @param int $post_id
     **/
    public function save_quantity_per_box_and_expiry_fields($post_id) {

        // Quantity Per Box
        $quantity_per_box = isset($_POST['_quantity_per_box']) ? sanitize_text_field($_POST['_quantity_per_box']) : 0;
        update_post_meta($post_id, '_quantity_per_box', $quantity_per_box);

        // Expiry Alert Duration
        $expiry_alert_duration = isset($_POST['_expiry_alert_duration']) ? sanitize_text_field($_POST['_expiry_alert_duration']) : 10;
        update_post_meta($post_id, '_expiry_alert_duration', $expiry_alert_duration);

        // Expiry Rule
        $expiry_rule = isset($_POST['_expiry_rule']) ? sanitize_text_field($_POST['_expiry_rule']) : 'no';
        update_post_meta($post_id, '_expiry_rule', $expiry_rule);

        if ($expiry_rule === 'yes' && isset($_POST['expiry_dates'], $_POST['expiry_quantities']) && is_array($_POST['expiry_dates']) && is_array($_POST['expiry_quantities']) && is_array($_POST['expiry_company']) && is_array($_POST['expiry_buying_price'])) {
            $expiry_data = [];
            foreach ($_POST['expiry_dates'] as $index => $expiry_date) {
                $expiry_data[] = [
                    'date' => sanitize_text_field($expiry_date),
                    'quantity' => (int)$_POST['expiry_quantities'][$index],
                    'company' => sanitize_text_field($_POST['expiry_company'][$index]),
                    'buying_price' => number_format($_POST['expiry_buying_price'][$index], 2, '.', ''),
                ];
            }
            update_post_meta($post_id, '_expiry_data', $expiry_data);

            return;
        }

        update_post_meta($post_id, '_expiry_data', []);
    }

    /**
     * Enqueue JavaScript for Admin
     **/
    public function enqueue_admin_scripts() {
        wp_enqueue_script('expiry-stock-manager', plugins_url('../assets/js/expiryStockManager' . (VUE_BUILD_MODE ? '' : '.min') . '.js', __FILE__), ['jquery'], '1.0', true);
        wp_enqueue_style('wc-expiry-stock-manager', plugins_url('../assets/css/expiryStockManager.css', __FILE__));
    }

	/**
	 * add expiry tab to product list
	 * @param $defaults
	 *
	 * @return array
     */
	public function product_column_head($defaults) {
		$defaults['product_expiry_wepos'] = __( 'Expiry', 'wepos' );
        $new_columns = [];
        foreach ($defaults as $key => $value) {
            $new_columns[$key] = $value;
            if ($key === 'price') {
                $new_columns['local_price'] = __( 'Local Price', 'wepos' );
                $new_columns['export_price'] = __( 'Export Price', 'wepos' );
            }
        }

        return $new_columns;
	}

	/**
     * content for expiry in product list
	 * @param $column_name
	 * @param $product_ID
	 *
	 * @return void
	 */
	public function product_column_content($column_name, $product_ID){
		if ($column_name === 'product_expiry_wepos') {
			$expiry_dates = get_post_meta( $product_ID, '_expiry_data', true );

			if (is_array($expiry_dates) && count($expiry_dates) > 0) {
				$date_format = get_option( 'date_format' );
				foreach ($expiry_dates as $expiry_date):
				echo '<div style="margin-bottom: 4px;"><span class="text-success">'.(isset($expiry_date['buying_price']) ? wc_price($expiry_date['buying_price']) : 'NaN') . '</span> - ' . $expiry_date['quantity'] . 'x  '.date($date_format, strtotime($expiry_date['date'])).' ( <span class="text-info">'.(!empty($expiry_date['company']) ? $expiry_date['company'] : 'NaN') .' </span>)</div>';
                endforeach;
			} else {
				echo '<span class="na">–</span>';
			}
		}

        // product local price
        if ( $column_name === 'local_price' ) {
            $local_price   = get_post_meta( $product_ID, '_local_price', true );

            echo wc_price( $local_price );
        }

        // product export price
        if ( $column_name === 'export_price' ) {
            $export_price  = get_post_meta( $product_ID, '_export_price', true );

            echo wc_price( $export_price );
        }

    }
}