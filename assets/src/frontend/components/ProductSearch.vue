<template>
    <div class="search-box" v-click-outside="outside">
        <form action="" autocomplete="off" @submit.prevent="handleProductScan">
            <input type="text" ref="productSearch" name="search" id="product-search" v-model="serachInput" :placeholder="placeholder" @focus.prevent="triggerFocus" @keyup.prevent="searchProduct">
            <span class="search-icon flaticon-musica-searcher" v-if="mode === 'product'"></span>
            <span class="search-icon flaticon-supermarket-scanner" v-if="mode === 'scan'"></span>
            <a v-if="serachInput && mode === 'product'" href="#" class="search-clear" @click.prevent="searchClose">
              <span class="flaticon-cancel-music"></span></a>
            <div class="search-type" v-hotkey="hotkeys">
                <a href="#" :class="{ active: mode === 'product'}" @click.prevent="changeMode('product')">{{ __( 'Product', 'wepos' ) }}</a>
                <a href="#" :class="{ active: mode === 'scan'}" @click.prevent="changeMode('scan')">{{ __( 'Scan', 'wepos' ) }}</a>
            </div>

        </form>
        <modal :title="__( 'Select Variations', 'wepos' )" v-if="showVariationModal" @close="showVariationModal = false" width="500px" height="auto" :footer="true" :header="true">
            <template slot="body">
                <div class="variation-attribute-wrapper" v-for="attribute in selectedVariationProduct.attributes">
                    <div class="attribute">
                        <p>{{ attribute.name }}</p>
                        <div class="options">
                            <template v-for="option in attribute.options">
                                <label>
                                    <input type="radio" v-model="chosenAttribute[attribute.name]" :value="option">
                                    <div class="box">
                                        {{ option }}
                                    </div>
                                </label>
                            </template>
                        </div>
                    </div>
                </div>
            </template>

            <template slot="footer">
                <button class="add-variation-btn" :disabled="attributeDisabled" @click="addVariationProduct()">{{ __( 'Add Product', 'wepos' ) }}</button>
            </template>
        </modal>
    </div>
</template>

<script>
import KeyboardControl from './KeyboardControl.vue';

let Modal = wepos_get_lib( 'Modal' );

export default {
    name: 'ProductInlineSearch',

    props: {
        products: {
            type: Array,
            default() {
                return [];
            }
        },
        settings: {
            type: Object,
            default() {
                return {};
            }
        }
    },

    components : {
        Modal,
        KeyboardControl
    },
    data() {
        return {
            showVariationModal: false,
            mode: 'product',
            serachInput: '',
            selectedVariationProduct: {},
            attributeDisabled: true,
            chosenAttribute: {},
        }
    },

    computed: {
        placeholder() {
            return ( this.mode === 'scan' ) ? this.__( 'Scan your product', 'wepos' ) : this.__( 'Search product by typing', 'wepos' );
        },

        hotkeys() {
            return {
                'f1': this.changeProductSearch,
                'f2': this.changeScan,
                'esc': this.searchClose,
            }
        }
    },

    watch: {
        chosenAttribute( newdata, olddata ) {
            if( Object.keys(newdata).length === this.selectedVariationProduct.attributes.length ) {
                this.attributeDisabled = false;
            }
        }
    },

    methods: {
        changeScan(e) {
            e.preventDefault();
            this.changeMode('scan');
        },

        changeProductSearch(e) {
            e.preventDefault();
            this.changeMode('product');
        },

        searchClose() {
            this.showVariationModal = false;
            this.serachInput = '';
            this.changeMode('scan');
            this.$refs.productSearch.blur();
        },

        onKeyDown() {
            jQuery('.product-search-item.selected').next().children('a').focus();
        },

        onKeyUp() {
            jQuery('.product-search-item.selected').prev().children('a').focus();
        },

        triggerFocus() {
            this.$emit( 'onfocus' );
        },

        outside() {
            this.$emit( 'onblur' );
        },

        changeMode( mode ) {
            this.mode = mode;
            if ( this.mode === 'scan' ) {
              this.$emit( 'searchableProduct', false);
            }
            this.$refs.productSearch.focus();
        },

        handleProductScan() {
            if ( this.mode === 'product' ) {
                return;
            }
          let generalSettings = this.settings.wepos_general,
              field = generalSettings.barcode_scanner_field === 'custom' ? 'barcode' : generalSettings.barcode_scanner_field,
              selectedProduct = {},
              filterProduct = this.products.filter((product) => {
                if (product.type === 'simple') {
                  if (product[field].toString() === this.serachInput) {
                    return true;
                  }
                }
                if (product.type === 'variable') {
                  let ifFound = false;
                  if (product.variations.length > 0) {
                    weLo_.forEach(product.variations, (item, key) => {
                      if (item[field].toString() === this.serachInput) {
                        ifFound = true;
                      }
                    });
                  }

                  if (ifFound) {
                    return true;
                  }
                }
                return false;
              });

          if ( filterProduct.length > 0 ) {
                filterProduct = filterProduct[0];

                if ( filterProduct.type === 'variable' ) {
                  const variations = filterProduct.variations;
                  const selectedVariationProduct = variations.filter((item) => {
                    return item[field].toString() === this.serachInput;

                  });
                  selectedProduct           = selectedVariationProduct[0];
                    selectedProduct.parent_id = filterProduct.id;
                    selectedProduct.type      = filterProduct.type;
                    selectedProduct.name      = filterProduct.name;

                    this.$emit( 'onProductAdded', selectedProduct );
                } else {
                    this.$emit( 'onProductAdded', filterProduct );
                }
            }

            this.serachInput = '';
        },

        searchProduct(e) {
            if ( this.serachInput ) {
                if ( this.mode === 'product' ) {
                    const searchableProduct = this.products.filter( (product) => {
                        if ( product.id.toString().indexOf( this.serachInput ) !== -1 ) {
                            return true;
                        } else if ( product.name.toString().toLowerCase().indexOf( this.serachInput.toLowerCase() ) !== -1 ) {
                            return true
                        } else return product.sku.indexOf(this.serachInput) !== -1;
                    } );

                  this.$emit( 'searchableProduct', searchableProduct );
                }
            }else{
                this.$emit( 'searchableProduct', false );
            }
        },

        selectVariation( product ) {
            this.selectedVariationProduct = product;
            this.showVariationModal = true;
        },

        addVariationProduct() {
          const chosenVariationProduct = this.findMatchingVariations(this.selectedVariationProduct.variations, this.chosenAttribute);
          const variationProduct = chosenVariationProduct[0];
          variationProduct.parent_id = this.selectedVariationProduct.id;
            variationProduct.type      = this.selectedVariationProduct.type;
            variationProduct.name      = this.selectedVariationProduct.name;

            this.$emit( 'onProductAdded', variationProduct );
            this.showVariationModal = false;
            this.chosenAttribute = {};
        },

        addToCartAction( product ) {
            this.$emit( 'onProductAdded', product );
        }

    },

    mounted() {
        this.$refs.productSearch.focus();
    }
};


</script>

<style lang="less">

.variation-attribute-wrapper {
    padding: 10px 20px 0px;

    .attribute {
        margin-bottom: 15px;
        p {
            padding: 0;
            margin: 0;
            text-align: left;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .options {
            text-align: left;
            label {
                display: inline-block;
                input[type=radio] {
                    -webkit-appearance: none;
                    display: none;

                    &:checked {
                        + .box {
                            background: #1ABC9C;
                            color: #fff;
                            border: 1px solid #1ABC9C;
                        }
                    }
                }
                .box {
                    padding: 6px 10px;
                    border: 1px solid #E0E5EA;
                    margin-right: 5px;
                    margin-bottom: 5px;
                    cursor: pointer;
                    font-size: 13px;
                    border-radius: 3px;
                }
            }
        }
    }
}

.add-variation-btn {
    border: none;
    padding: 10px 10px;
    background: #3B80F4;
    color: #fff;
    border-radius: 3px;
    width: 150px;
    font-size: 14px;
    cursor: pointer;

    &:focus, &:active {
        outline: none;
    }

    &:disabled {
        background: #76A2ED;
    }
}

</style>
