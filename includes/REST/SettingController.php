<?php
namespace WeDevs\WePOS\REST;

/**
 * Tax API Controller
 */
class SettingController extends \WP_REST_Controller {

	/**
	 * Endpoint namespace
	 *
	 * @var string
	 */
	protected $namespace = 'wepos/v1';

	/**
	 * Route name
	 *
	 * @var string
	 */
	protected $base = 'settings';

    /**
     * Register all routes related with settings
     *
     * @since 1.1.2
     *
     * @return void
     */
    public function register_routes() {
        register_rest_route( $this->namespace, '/' . $this->base, array(
            array(
                'methods'              => \WP_REST_Server::READABLE,
                'callback'             => array( $this, 'get_settings' ),
                'args'                 => $this->get_collection_params(),
                'permission_callback'  => [ $this, 'get_setting_permission_check' ]
            ),
        ) );
    }

	/**
	 * Setting permission check
	 *
	 * @since 1.1.2
     *
     * @return bool|\WP_Error
     *
     */
	public function get_setting_permission_check() {
		if ( ! ( current_user_can( 'manage_woocommerce' ) || apply_filters( 'wepos_rest_manager_permissions', false ) ) ) {
			return new \WP_Error( 'wepos_rest_cannot_batch', __( 'Sorry, you are not allowed view this resource.', 'wepos' ), array( 'status' => rest_authorization_required_code() ) );
		}

		return true;
	}

	/**
	 * Get settings
	 *
     * @since 1.0.0
     *
     * @return \WP_Error|\WP_HTTP_Response|\WP_REST_Response
     *
     */
	public function get_settings() {
		return rest_ensure_response( get_wepos_settings() );
	}

}
