<template>
  <li class="sidebar-dropdown">
    <a href="#" class="dropdown-toggle" @click.prevent="toggleDropdown">
      <span class="quick-menu">
        <SellerIcon  class="quick-menu-icon"/>
        {{ __('Vendors', 'wepos') }}
      </span>

      <span class="dropdown-arrow" :class="{ 'open': isDropdownOpen }">
        <angleSmallDownIcon size="16"/>
      </span>
    </a>

    <!-- The submenu (vendor list) -->
    <ul v-show="isDropdownOpen" class="sidebar-submenu">
      <li>
        <a href="#/?vendor_type=regular" @click="linkClicked('regular')">
          {{ __('Regular', 'wepos') }}
        </a>
      </li>
      <li>
        <a href="#/?vendor_type=local" @click="linkClicked('local')">
          {{ __('Local', 'wepos') }}
        </a>
      </li>
      <li>
        <a href="#/?vendor_type=export" @click="linkClicked('export')">
          {{ __('Export', 'wepos') }}
        </a>
      </li>
    </ul>
  </li>
</template>

<script>
import angleSmallDownIcon from "@/utils/icons/AngleSmallDownIcon.vue";
import SellerIcon from "@/utils/icons/SellerIcon.vue";

export default {
  components: {
    SellerIcon,
    angleSmallDownIcon
  },

  data() {
    return {
      isDropdownOpen: false,
    };
  },
  methods: {
    toggleDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
    },
    linkClicked(vendor) {
      this.$emit('selected-vendor', vendor);
      this.$emit('link-clicked');
    },
  },
};
</script>

<style scoped>
.sidebar-dropdown {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dropdown-toggle {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dropdown-arrow > svg {
  transition: transform 0.3s ease;
}

.dropdown-arrow.open > svg {
  transform: rotate(180deg);
}

.sidebar-submenu li > a {
  margin-left: 16px;
}
.sidebar-submenu{
  border-top: #e9edf0 1px solid;
  border-bottom: #e9edf0 1px solid;
}

.sidebar-submenu li:hover {
  background-color: #e9edf0;
}
.sidebar-submenu[v-show="true"] {
  display: block;
  transition: all 0.3s ease;
}
.quick-menu{
  display: flex;
  align-items: center;
}
</style>
