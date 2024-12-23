<?php
namespace WeDevs\WePOS;


defined( 'ABSPATH' ) || exit;

/**
 * Installer Class.
 *
 * @since WEPOS_SINCE
 *
 * @package wepos
 */
class Installer {

    /**
     * Run The Installer.
     *
     * @since WEPOS_SINCE
     *
     * @return void
     */
    public function run() {
        $this->add_version_info();
        $this->add_user_roles();
        $this->flush_rewrites();
        $this->schedule_cron_jobs();
        $this->create_partial_payment_table_if_not_exists();
        $this->create_user_activity_log_table_if_not_exists();
    }

    /**
     * Add Version Info.
     *
     * @since WEPOS_SINCE
     *
     * @return void
     */
    private function add_version_info() {
        $installed = get_option( 'we_pos_installed' );

        if ( ! $installed ) {
            update_option( 'we_pos_installed', time() );
        }

        update_option( 'we_pos_version', WEPOS_VERSION );
    }

    /**
     * Add User Roles.
     *
     * @since WEPOS_SINCE
     *
     * @return void
     */
    private function add_user_roles() {
        if ( function_exists( 'dokan' ) ) {
            $users_query = new \WP_User_Query( [
                'role__in' => [ 'seller', 'vendor_staff' ],
            ] );
            $users       = $users_query->get_results();

            if ( count( $users ) > 0 ) {
                foreach ( $users as $user ) {
                    $user->add_cap( 'publish_shop_orders' );
                    $user->add_cap( 'list_users' );
                }
            }
        }
    }

    /**
     * Flush Rewrites.
     *
     * @since WEPOS_SINCE
     *
     * @return void
     */
    private function flush_rewrites() {
        set_transient( 'wepos-flush-rewrites', 1 );
    }

    /**
     * Schedule Cron Jobs.
     *
     * @since WEPOS_SINCE
     *
     * @return void
     */
    private function schedule_cron_jobs() {
        if ( ! function_exists( 'WC' ) || ! WC()->queue() ) {
            return;
        }

        // Schedule daily cron job.
        $hook = 'wepos_daily_midnight_cron';

        // Check if we've defined the cron hook.
        $cron_schedule = as_next_scheduled_action( $hook ); // This method will return false if the hook is not scheduled
        if ( ! $cron_schedule ) {
            as_unschedule_all_actions( $hook );
        }

        // Schedule recurring cron action.
        $now = wepos_current_datetime()->modify( 'midnight' )->getTimestamp();
        WC()->queue()->schedule_cron( $now, '0 0 * * *', $hook, [], 'dokan' );
    }

    /**
     * Create Partial Payment Table If Not Exists
     * @return void
     */
    private function create_partial_payment_table_if_not_exists() {
        //file where sql queries are used to create table
        require_once(WEPOS_INCLUDES . '/Admin/Updates/upgrade-1.3.0.php');
        require_once(WEPOS_INCLUDES . '/Admin/Updates/upgrade-1.3.6.php');
        require_once(WEPOS_INCLUDES . '/Admin/Updates/upgrade-1.3.8.php');
        require_once(WEPOS_INCLUDES . '/Admin/Updates/upgrade-1.3.9.php');
    }

    /**
     * Create User Activity Log Table If Not Exists
     * @return void
     */
    protected function create_user_activity_log_table_if_not_exists() {
        //file where sql queries are used to create table
        require_once(WEPOS_INCLUDES . '/Admin/Updates/upgrade-1.3.2.php');
    }
}
