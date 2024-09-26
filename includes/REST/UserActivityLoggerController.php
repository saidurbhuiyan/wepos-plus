<?php
namespace WeDevs\WePOS\REST;

use WP_REST_Controller;
use WP_Error;
use WP_REST_Response;

class UserActivityLoggerController extends WP_REST_Controller {

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
    protected $base = 'user-activity';

    /**
     * Register all routes related to user activity
     *
     * @since 1.0.0
     *
     * @return void
     */
    public function register_routes() {
        register_rest_route($this->namespace, '/' . $this->base, array(
            array(
                'methods'              => \WP_REST_Server::READABLE,
                'callback'             => array($this, 'get_user_activity_logs'),
                'args'                 => $this->get_collection_params(),
                'permission_callback'  => [$this, 'get_activity_permission_check'],
            ),
        ));
    }

    /**
     * Activity permission check
     *
     * @since 1.0.0
     *
     * @return bool|WP_Error
     */
    public function get_activity_permission_check() {
        if (!current_user_can('manage_options')) {
            return new WP_Error('wepos_rest_cannot_view_activity', __('Sorry, you are not allowed to view this resource.', 'wepos'), array('status' => rest_authorization_required_code()));
        }
        return true;
    }

    /**
     * Get user activity logs
     *
     * @since 1.0.0
     *
     * @return WP_REST_Response|WP_Error
     */
    public function get_user_activity_logs() {
        return rest_ensure_response([]);

    }



}
