import Settings from 'admin/components/Settings.vue'
import UserActivity from "admin/components/UserActivity.vue";

let Vue    = wepos_get_lib( 'Vue' )
let Router = wepos_get_lib( 'Router' )

Vue.use(Router)

export default new Router({
    routes: wepos.hooks.applyFilters( 'wepos_admin_routes', [
        {
            path: '/settings',
            name: 'Settings',
            component: Settings
        },
        {
            path: '/user-activity',
            name: 'UserActivity',
            component: UserActivity,

        }
    ] )
})
