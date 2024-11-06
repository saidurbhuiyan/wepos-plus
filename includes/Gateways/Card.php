<?php

namespace WeDevs\WePOS\Gateways;

class Card extends \WC_Payment_Gateway
{
    /**
     * Constructor for the gateway.
     */
    public function __construct() {
        // Setup general properties.
        $this->setup_properties();

        // Load the settings.
        $this->init_form_fields();
        $this->init_settings();

        // Get settings.
        $this->title              = $this->get_option( 'title' );
        $this->description        = $this->get_option( 'description' );

        add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
    }

    /**
     * Setup general properties for the gateway.
     */
    protected function setup_properties() {
        $this->id                 = 'wepos_card';
        $this->icon               = apply_filters( 'wepos_card_icon', '' );
        $this->method_title       = __( 'Wepos Card', 'wepos' );
        $this->method_description = __( 'Have your customers pay with card', 'wepos' );
        $this->has_fields         = false;
    }

    /**
     * Initialise Gateway Settings Form Fields.
     */
    public function init_form_fields() {

        $this->form_fields = array(
            'enabled'            => array(
                'title'       => __( 'Enable/Disable', 'wepos' ),
                'label'       => __( 'Enable Card gateway', 'wepos' ),
                'type'        => 'checkbox',
                'description' => '',
                'default'     => 'yes',
            ),
            'title'              => array(
                'title'       => __( 'Title', 'wepos' ),
                'type'        => 'text',
                'description' => __( 'Payment method description that the marchent see in pos checkout', 'wepos' ),
                'default'     => __( 'Card', 'wepos' ),
                'desc_tip'    => true,
            ),
            'description'        => array(
                'title'       => __( 'Description', 'wepos' ),
                'type'        => 'textarea',
                'description' => __( 'Payment method description that marchent see in pos checkout page', 'wepos' ),
                'default'     => __( 'Pay with card', 'wepos' ),
                'desc_tip'    => true,
            )
        );
    }

    /**
     * Check If The Gateway Is Available For Use.
     *
     * @return bool
     */
    public function is_available() {
        $order          = null;
        $needs_shipping = false;

        // Test if shipping is needed first.
        if ( is_page( wc_get_page_id( 'checkout' ) ) ) {
            return true;
        }

        return parent::is_available();
    }

    /**
     * Process the payment and return the result.
     *
     * @param int $order_id Order ID.
     *
     * @return array
     *
     * @throws \WC_Data_Exception
     */
    public function process_payment( $order_id ) {
        $order = wc_get_order( $order_id );

        // Mark as processing or on-hold (payment won't be taken until delivery).
        $order->payment_complete();

        $order->update_status( 'completed', __( 'Payment collected via card', 'wepos' ) );
        $order->add_order_note(
            sprintf(
            /* translators: 1: Cash tendered amount 2: Cash change amount. */
                __( 'Card tendered amount: %1$s, Change amount: %2$s', 'wepos' ),
                $order->get_meta( '_wepos_card_tendered_amount', true ),
                $order->get_meta( '_wepos_card_change_amount', true )
            )
        );

        $order->save();

        // Return thankyou redirect.
        return array(
            'result'   => 'success',
        );
    }
}