<template>
  <div class="wepos-user-activity">
    <h2 style="margin-bottom: 15px;">{{ __( 'User Activity Logs', 'wepos' ) }}</h2>

    <div id="activity-message_updated" class="settings-error notice is-dismissible" :class="{ 'updated' : isUpdated, 'error' : !isUpdated }" v-if="isSaved">
      <p><strong v-html="message"></strong></p>
      <button type="button" class="notice-dismiss" @click.prevent="isSaved = false">
        <span class="screen-reader-text">{{ __( 'Dismiss this notice.', 'wepos' ) }}</span>
      </button>
    </div>

    <div class="wepos-activity-wrap">
      <div class="metabox-holder">
        <table class="form-table widefat fixed striped">
          <colgroup>
            <col style="width: 15%;">
            <col style="width: 15%;">
            <col style="width: 50%;">
            <col style="width: 20%;">
          </colgroup>
          <thead>
          <tr>
            <th>{{ __( 'User', 'wepos' ) }}</th>
            <th>{{ __( 'View Reference', 'wepos' ) }}</th>
            <th>{{ __( 'Details', 'wepos' ) }}</th>
            <th>{{ __( 'Date', 'wepos' ) }}</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(log, index) in activityLogs" :key="index">
            <td style="width: 20%"><a class="link-name" :href="`${adminUrl}user-edit.php?user_id=${log.id}`">{{ log.user_login }}</a></td>
            <td style="width: 20%"><a class="link-name" :href="`${adminUrl}post.php?post=${log.reference_id}&action=edit`">View {{log.log_type}}</a></td>
            <td style="width: 40%">{{ log.details }}</td>
            <td style="width: 20%">{{ formatDate(log.action_time) }}</td>
          </tr>
          <tr v-if="!activityLogs.length">
            <td colspan="3" class="no-activity">{{ __( 'No activity logs found.', 'wepos' ) }}</td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span>{{ totalLogs }} {{ __( 'Logs', 'wepos' ) }} </span>
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">{{ __( 'Previous', 'wepos' ) }}</button>
        <span>{{ currentPage }} {{ __( 'of', 'wepos' ) }} {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages || totalPages === 0">{{ __( 'Next', 'wepos' ) }}</button>
      </div>

      <div class="loading" v-if="showLoading">
        <!-- You can add a loader animation here -->
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserActivityLogs',

  data () {
    return {
      isSaved: false,
      showLoading: false,
      isUpdated: false,
      message: '',
      activityLogs: [],
      currentPage: 1,
      totalPages: 1,
      totalLogs: 0,
      logsPerPage: 10,
      adminUrl: '',
    }
  },

  methods: {
    fetchActivityLogs(page = 1) {
      const self = this;
      const data = {
        action: 'wepos_get_user_activity_logs',
        page: page,
        nonce: wepos.nonce
      };

      self.showLoading = true;

      jQuery.post(wepos.ajaxurl, data, function(res) {
        if (res.success) {
          self.activityLogs = res.data.logs;
          self.totalLogs = res.data.total_logs;
          self.totalPages = res.data.total_pages;
          self.nextPage = res.data.next_page;
          self.previousPage = res.data.prev_page;
          self.currentPage = page;
          self.adminUrl = res.data.admin_url;
        } else {
          self.message = resp.data.message;
          self.isUpdated = false;
        }
        self.showLoading = false;
      });
    },

    formatDate(dateString) {
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    },

    goToPage(page) {
      if (page > 0 && page <= this.totalPages) {
        this.fetchActivityLogs(page);
      }
    }
  },

  created() {
    this.fetchActivityLogs();
  }
};
</script>

<style lang="less">
.wepos-activity-wrap {
  position: relative;
  border: 1px solid #c8d7e1;
  margin-top: 20px;

  .loading {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.6);
    z-index: 10;

    .wepos-loader {
      top: 40%;
      left: 45%;
      position: absolute;
    }
  }

  .metabox-holder {
    padding: 20px;
    background: #fff;

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #c8d7e1;
      border-radius: 5px;
      table-layout:fixed;

      th, td {
        padding: 10px;
        text-align: left;
        border: 1px solid #c8d7e1;
      }

      th {
        background-color: #ffffff;
        color: #333;
        font-weight: bold;
        border-bottom: 2px solid #0073aa;
      }

      td {
        word-wrap: break-word;
      }

      a.link-name{
        text-transform: capitalize;
      }

      tr:nth-child(odd) {
        background-color: #f9f9f9;
      }

      tr:nth-child(even) {
        background-color: #ffffff;
      }

      tr:hover {
        background-color: #e0e0e0;
      }

      .no-activity {
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 20px 0;
      }
    }
  }

  .pagination {
    margin: 10px 5px;
    text-align: right;

    button {
      background-color: #0073aa;
      color: #fff;
      border: none;
      padding: 5px 10px;
      margin: 0 2px;
      cursor: pointer;
      border-radius: 3px;

      &:disabled {
        background-color: #c8c8c8;
        cursor: not-allowed;
      }
    }

    span {
      margin: 0 5px;
    }
  }
}
</style>
