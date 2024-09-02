<?php

use Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController;

/**
 * WePOS Footer
 *
 * @since 1.0.0
 *
 * @return void
 */
function wepos_footer() {
    do_action( 'wepos_footer' );
}

/**
 * Get translactions for WePos plugin
 *
 * @param string $domain
 * @param string $language_dir
 *
 * @return array
 */
function wepos_get_translations_for_plugin_domain( $domain, $language_dir = null ) {

    if ( $language_dir == null ) {
        $language_dir      = WEPOS_PATH . '/languages/';
    }

    $languages     = get_available_languages( $language_dir );
    $get_site_lang = is_admin() ? get_user_locale() : get_locale();
    $mo_file_name  = $domain . '-' . $get_site_lang;
    $translations  = [];

    if ( in_array( $mo_file_name, $languages ) && file_exists( $language_dir . $mo_file_name . '.mo' ) ) {
        $mo = new MO();
        if ( $mo->import_from_file( $language_dir . $mo_file_name . '.mo' ) ) {
            $translations = $mo->entries;
        }
    }

    return [
        'header'       => isset( $mo ) ? $mo->headers : '',
        'translations' => $translations,
    ];
}

/**
 * Returns Jed-formatted localization data.
 *
 * @param  string $domain Translation domain.
 *
 * @return array
 */
function wepos_get_jed_locale_data( $domain, $language_dir = null ) {
    $plugin_translations = wepos_get_translations_for_plugin_domain( $domain, $language_dir );
    $translations = get_translations_for_domain( $domain );

    $locale = array(
        'domain'      => $domain,
        'locale_data' => array(
            $domain => array(
                '' => array(
                    'domain' => $domain,
                    'lang'   => is_admin() ? get_user_locale() : get_locale(),
                ),
            ),
        ),
    );

    if ( ! empty( $translations->headers['Plural-Forms'] ) ) {
        $locale['locale_data'][ $domain ]['']['plural_forms'] = $translations->headers['Plural-Forms'];
    } else if ( ! empty( $plugin_translations['header'] ) ) {
        $locale['locale_data'][ $domain ]['']['plural_forms'] = $plugin_translations['header']['Plural-Forms'];
    }

    $entries = array_merge( $plugin_translations['translations'], $translations->entries );

    foreach ( $entries as $msgid => $entry ) {
        $locale['locale_data'][ $domain ][ $msgid ] = $entry->translations;
    }

    return $locale;
}

/**
 * Recursively sort an array of taxonomy terms hierarchically. Child categories will be
 * placed under a 'children' member of their parent term.
 *
 * @param Array   $cats     taxonomy term objects to sort
 * @param Array   $into     result array to put them in
 * @param integer $parent_id the current parent ID to put them in
 *
 * @return array
 */
function wepos_sort_terms_hierarchicaly( &$cats, &$into, $parent_id = 0 ) {
    foreach ( $cats as $i => $cat) {
        if ( $cat->parent == $parent_id ) {
            $into[$cat->term_id] = $cat;
            unset( $cats[$i] );
        }
    }

    foreach ( $into as $top_cat ) {
        $top_cat->children = array();
        wepos_sort_terms_hierarchicaly( $cats, $top_cat->children, $top_cat->term_id );
    }
}

/**
 * Get product category by hirarchycal
 *
 * @since 1.0.0
 *
 * @return array
 */
function wepos_get_product_category() {
    $categories        = get_terms( 'product_cat', [ 'hide_empty' => false ] );
    $category_hierarchy = [];
    wepos_sort_terms_hierarchicaly( $categories, $category_hierarchy );
    return $category_hierarchy;
}

/**
 * Get Post Type array
 *
 * @since 1.0.0
 *
 * @param  string $post_type
 *
 * @return array
 */
function wepos_get_post_type( $post_type ) {
    $pages_array = array( '-1' => __( '- select -', 'wepos' ) );
    $pages       = get_posts( array('post_type' => $post_type, 'numberposts' => -1) );

    if ( $pages ) {
        foreach ($pages as $page) {
            $pages_array[$page->ID] = $page->post_title;
        }
    }

    return $pages_array;
}

/**
 * Get settings sections
 *
 * @since 1.0.0
 *
 * @return array
 */
function wepos_get_settings_sections() {
    $sections = [
        [
            'id'    => 'wepos_general',
            'title' => __( 'General', 'wepos' ),
            'icon'  => 'dashicons-admin-generic'
        ],
        [
            'id'    => 'wepos_receipts',
            'title' => __( 'Receipts', 'wepos' ),
            'icon'  => 'dashicons-media-text'
        ]
    ];

    return apply_filters( 'wepos_settings_sections', $sections );
}

/**
 * Get settings fields
 *
 * @since 1.0.0
 *
 * @return array
 */
function wepos_get_settings_fields() {
    $settings_fields = [
        'wepos_general' => [
            'enable_fee_tax' => [
                'name'    => 'enable_fee_tax',
                'label'   => __( 'Calculate tax for Fee', 'wepos' ),
                'desc'    => __( 'Choose if tax caluclate for fee in POS cart and checkout', 'wepos' ),
                'type'    => 'select',
                'default' => 'yes',
                'options' => [
                    'yes' => __( 'Yes', 'wepos' ),
                    'no'  => __( 'No', 'wepos' ),
                ]
            ],
            'barcode_scanner_field' => [
                'name'    => 'barcode_scanner_field',
                'label'   => __( 'Barcode Scanner field', 'wepos' ),
                'desc'    => __( 'Choose your barcode field. If you select <code>Custom Field</code> then you need to set barcode number manually in product edit page', 'wepos' ),
                'type'    => 'select',
                'default' => 'sku',
                'options' => [
                    'id'     => __( 'ID', 'wepos' ),
                    'sku'    => __( 'SKU', 'wepos' ),
                    'custom' => __( 'Custom field', 'wepos' ),
                ]
            ],

            'enable_partial_payment' => [
	            'name'    => 'enable_partial_payment',
	            'label'   => __( 'Enable Partial Payment', 'wepos' ),
	            'desc'    => __( 'Choose if partial payment is allowed in POS cart and checkout', 'wepos' ),
	            'type'    => 'select',
	            'default' => 'yes',
	            'options' => [
		            'yes' => __( 'Yes', 'wepos' ),
		            'no'  => __( 'No', 'wepos' ),
	            ],
            ],
        ],
        'wepos_receipts' => [
            'receipt_header' => [
                'name'    => 'receipt_header',
                'label'   => __( 'Order receipt header', 'wepos' ),
                'desc'    => __( 'Enter your order receipt header', 'wepos' ),
                'type'    => 'wpeditor',
                'default' => get_option( 'blogname' )
            ],
            'receipt_footer' => [
                'name'    => 'receipt_footer',
                'label'   => __( 'Order receipt footer', 'wepos' ),
                'desc'    => __( 'Enter your order receipt footer text', 'wepos' ),
                'type'    => 'wpeditor',
                'default' => __( 'Thank you', 'wepos' )
            ],
        ],
    ];

    return apply_filters( 'wepos_settings_fields', $settings_fields );
}

/**
 * Get the value of a settings field
 *
 * @param string $option settings field name
 * @param string $section the section name this field belongs to
 * @param string $default default text if it's not found
 *
 * @return mixed
 */
function wepos_get_option( $option, $section, $default = '' ) {

    $options = get_option( $section );

    if ( isset( $options[ $option ] ) ) {
        return $options[ $option ];
    }

    return $default;
}

/**
 * Get wepos settings
 * @return array
 */
function get_wepos_settings()
{
	$settings = [];

	if (!function_exists('wepos_get_settings_fields')) {
		return $settings;
	}

	foreach ( wepos_get_settings_fields() as $section_key => $settings_options ) {
		$section_option = get_option( $section_key, [] );
		foreach ( $settings_options as $settings_key => $settings_value ) {
			$settings[$section_key][$settings_key] = isset( $section_option[$settings_key] ) ? $section_option[$settings_key] : $settings_options[$settings_key]['default'];
		}
	}

	$tax_display_on_shop = get_option( 'woocommerce_tax_display_shop', 'excl' );
	$tax_display_on_cart = get_option( 'woocommerce_tax_display_cart', 'excl' );
	$settings['woo_tax'] = [
		'wc_tax_display_shop' => $tax_display_on_shop,
		'wc_tax_display_cart' => $tax_display_on_cart,
	];

	return $settings;

}

/**
 * Detects if current page is wePOS frontend page
 *
 * @return bool
 */
function wepos_is_frontend() {
    $hasPermission = false;

    if ( wp_validate_boolean( get_query_var( 'wepos' ) ) ) {
        if ( current_user_can( 'manage_woocommerce' ) || apply_filters( 'wepos_frontend_permissions', false ) ) {
            $hasPermission = true;
        }
    }

    return $hasPermission;
}

/**
 * Function current_datetime() compatibility for wp version < 5.3
 *
 * @return DateTimeImmutable
 * @throws Exception
 * @since WEPOS_SINCE
 *
 */
function wepos_current_datetime() {
    if ( function_exists( 'current_datetime' ) ) {
        return current_datetime();
    }

    return new DateTimeImmutable( 'now', wepos_wp_timezone() );
}

/**
 * Function wp_timezone() compatibility for wp version < 5.3
 *
 * @return DateTimeZone
 * @throws Exception
 * @since WEPOS_SINCE
 *
 */
function wepos_wp_timezone() {
    if ( function_exists( 'wp_timezone' ) ) {
        return wp_timezone();
    }

    return new DateTimeZone( wepos_wp_timezone_string() );
}

/**
 * Function wp_timezone_string() compatibility for wp version < 5.3
 *
 * @since WEPOS_SINCE
 *
 * @return string
 */
function wepos_wp_timezone_string() {
    if ( function_exists( 'wp_timezone_string' ) ) {
        return wp_timezone_string();
    }

    $timezone_string = get_option( 'timezone_string' );

    if ( $timezone_string ) {
        return $timezone_string;
    }

    $offset  = (float) get_option( 'gmt_offset' );
    $hours   = (int) $offset;
    $minutes = ( $offset - $hours );

    $sign      = ( $offset < 0 ) ? '-' : '+';
    $abs_hour  = abs( $hours );
    $abs_mins  = abs( $minutes * 60 );
    $tz_offset = sprintf( '%s%02d:%02d', $sign, $abs_hour, $abs_mins );

    return $tz_offset;
}

/**
 * Check if current user is an admin
 * @return bool
 */
function is_current_user_admin ()
{
	return current_user_can( 'manage_woocommerce' ) && current_user_can( 'administrator' );
}


/**
 * Check if HPOS is enabled
 * @return bool
 */
function is_hpos_enabled() {
	return class_exists(CustomOrdersTableController::class) &&
	       wc_get_container()->get(CustomOrdersTableController::class)->custom_orders_table_usage_is_enabled();
}

/**
 * Get HPOS Screen ID
 * @return string
 */
function admin_shop_order_screen() {
	$screen = 'shop_order';
	if (is_hpos_enabled()) {
		$screen = function_exists('wc_get_page_screen_id') ? wc_get_page_screen_id('shop-order') : 'woocommerce_page_wc-orders';  // Traditional Screen ID
	}
	return $screen;
}

/**
 * Get HPOS Hook Names from legacy hook
 * @param $hook_name
 *
 * @return string
 */
function get_hpos_hook_names($hook_name) {
	$hpos_hook_names = [
		'manage_edit-shop_order_columns' => 'manage_woocommerce_page_wc-orders_columns',
		'manage_shop_order_posts_custom_column' => 'manage_woocommerce_page_wc-orders_custom_column',
		'bulk_actions-edit-shop_order' => 'bulk_actions-woocommerce_page_wc-orders',
		'handle_bulk_actions-edit-shop_order' => 'handle_bulk_actions-woocommerce_page_wc-orders',
	];

	return is_hpos_enabled() && isset($hpos_hook_names[$hook_name]) ? $hpos_hook_names[$hook_name] : $hook_name;
}
