import Helper from '../helper';

export default {
    namespaced: true,
    state: {
        settings: {},
        availableTax : {},
        cartdata :  {
            line_items: [],
            fee_lines: [],
            coupon_lines: [],
        }
    },
    getters: {
        getSubtotal( state ) {
            var subtotal = 0;
            weLo_.forEach( state.cartdata.line_items, function( item, key ) {

                if ( item.on_sale ) {
                    subtotal += (item.quantity*item.sale_price)
                } else {
                    const price = item.vendor_type === 'local' ? item.local_price : item.export_price
                    subtotal += (item.quantity*(item.vendor_type === 'regular' ? item.regular_price : price))
                }
            });

            return subtotal;
        },
        getTotalFee( state ) {
            var fee = 0;
            weLo_.forEach( state.cartdata.fee_lines, function( item, key ) {
                fee += Math.abs( item.total );
            });
            return fee;
        },
        getTotalDiscount( state ) {
            var discount = 0;
            weLo_.forEach( state.cartdata.coupon_lines, function( item, key ) {
                discount += Number( Math.abs( item.total ) );
            });

            return discount;
        },
        getTotalLineTax( state ) {
            var self = this,
                taxLineTotal = 0;

            weLo_.forEach( state.cartdata.line_items, function( item, key ) {
                taxLineTotal += Math.abs( item.tax_amount * item.quantity );
            });

            return taxLineTotal;
        },
        getTotalTax( state, getters ) {
            let self = this,
                taxLineTotal = 0,
                taxFeeTotal = 0,
                discountPercentage = 0,
                couponTaxDiscount = 0;

            weLo_.forEach( state.cartdata.line_items, function( item, key ) {
                taxLineTotal += Math.abs( item.tax_amount * item.quantity );
            } );

            if ( state.settings.woo_tax != undefined && state.settings.woo_tax.wc_tax_display_cart == 'incl' ) {
                taxLineTotal = 0;
            }

            weLo_.forEach( state.cartdata.fee_lines, function( item, key ) {
                if ( item.tax_status !== 'taxable' ) {
                    return;
                }

                let itemTaxClass = item.tax_class === '' ? 'standard' : item.tax_class;
                let taxClass     = weLo_.find( state.availableTax, { 'class' : itemTaxClass.toString() } );

                if ( ! taxClass ) {
                    return;
                }

                taxFeeTotal += ( Math.abs( item.total ) * Math.abs( taxClass.rate ) ) / 100;
            } );

            weLo_.forEach( state.cartdata.coupon_lines, function( item, key ) {
                if ( item.tax_status !== 'taxable' ) {
                    return;
                }

                let itemTaxClass = item.tax_class === '' ? 'standard' : item.tax_class;
                let taxClass      = weLo_.find( state.availableTax, { 'class' : itemTaxClass.toString() } );

                if ( ! taxClass ) {
                    return;
                }

                discountPercentage = ( item.total / getters.getSubtotal ) * 100;

                couponTaxDiscount += ( discountPercentage / 100 ) * taxLineTotal;
            } );

            taxLineTotal += couponTaxDiscount;

            return taxLineTotal + taxFeeTotal;
        },
        getOrderTotal( state, getters ) {
            return (getters.getSubtotal + getters.getTotalFee + getters.getTotalTax );
        },
        getTotal( state, getters ) {
            return getters.getOrderTotal-getters.getTotalDiscount;
        },
        getSettings( state, getters ) {
            return state.settings;
        }
    },
    mutations: {
        setSettings( state, settings ) {
            state.settings = settings;
        },

        setAvailableTax( state, availableTax ) {
            state.availableTax = availableTax;
        },

        setCartData( state, cartdata ) {
            if ( weLo_.isEmpty( cartdata ) ) {
                state.cartdata = {
                    line_items: [],
                    fee_lines: [],
                    coupon_lines: [],
                }
            } else {
                state.cartdata = Object.assign( {}, cartdata );
            }
        },

        addToCartItem( state, product ) {
            var cartObject = {};
            cartObject.product_id         = ( product.parent_id === 0 ) ? product.id : product.parent_id;
            cartObject.name               = product.name;
            cartObject.quantity           = 1;
            cartObject.regular_price      = product.regular_display_price;
            cartObject.sale_price         = product.sales_display_price;
            cartObject.local_price        = product.local_display_price || product.regular_display_price;
            cartObject.export_price       = product.export_display_price || product.regular_display_price;
            cartObject.on_sale            = product.on_sale;
            cartObject.attribute          = product.attributes;
            cartObject.variation_id       = ( product.parent_id !== 0 ) ? product.id : 0;
            cartObject.editQuantity       = false;
            cartObject.type               = product.type;
            cartObject.tax_amount         = product.tax_amount;
            cartObject.manage_stock       = product.manage_stock;
            cartObject.stock_status       = product.stock_status;
            cartObject.backorders_allowed = product.backorders_allowed;
            cartObject.stock_quantity     = product.stock_quantity;
            cartObject.stock_expiry       = product.stock_expiry
            cartObject.expiry             = null
            cartObject.vendor_type        = product.vendor_type?? 'regular';

            var index = weLo_.findIndex( state.cartdata.line_items, { product_id: cartObject.product_id, variation_id: cartObject.variation_id} );

            if ( index < 0 ) {
                if ( Helper.hasStock( product ) ) {
                    state.cartdata.line_items.push( cartObject );
                }
            } else {
                if ( Helper.hasStock( product, state.cartdata.line_items[index].quantity ) ) {
                    state.cartdata.line_items[index].quantity += 1;
                }
            }
        },

        removeCartItem( state, itemKey ) {
            state.cartdata.line_items.splice( itemKey, 1 );
        },

        addCartItemQuantity( state, itemKey ) {
            var item = state.cartdata.line_items[itemKey];
            if ( Helper.hasStock( item, item.quantity ) ) {
                state.cartdata.line_items[itemKey].quantity++;
            }

        },

        removeCartItemQuantity( state, itemKey ) {
            var item = state.cartdata.line_items[itemKey];
            if (item.expiry && item.expiry.reduce(( total, expiry ) => total + expiry.quantity, 0 ) >= item.quantity) {
                return
            }
            if ( item.quantity <= 1 ) {
                state.cartdata.line_items[itemKey].quantity = 1;
            } else {
                state.cartdata.line_items[itemKey].quantity--;
            }
        },

        updateCartExpiryItemQuantity( state, payload ) {
            let { key, expiryDate, quantity } = payload;

            let item = state.cartdata.line_items[key];
            const stockExpiry = item.stock_expiry.find(expiry => expiry.date === expiryDate);

            if (!item || !expiryDate || quantity === null || !stockExpiry) return;
            quantity = parseInt(quantity);

            if (!item.expiry) item.expiry = [];

            let expiryExists = item.expiry.find(expiry => expiry.date === expiryDate);

            let itemQuantity = parseInt(item.quantity);
            let expireExistQuantity = expiryExists ? parseInt(expiryExists.quantity) : 0;

            if (expiryExists && quantity <= 0){
                item.quantity = itemQuantity > expireExistQuantity ? itemQuantity - expireExistQuantity : 0;
                item.expiry = item.expiry.filter(expiry => expiry.date !== expiryDate);
                return;
            }

            if (!Helper.hasExpiryStock(item, expiryDate, quantity)) return;
            let newItemQuantity = quantity;
            if (expiryExists) {
                newItemQuantity = quantity - expireExistQuantity;
                expiryExists.quantity = quantity;
            } else {
                itemQuantity =  itemQuantity === 1 && item.expiry.length === 0 ? 0 : itemQuantity;
                item.expiry.push({
                    date: expiryDate,
                    quantity: quantity,
                    company: stockExpiry.company?? null,
                    buying_price: stockExpiry.buying_price?? null,
                });
            }

            item.quantity = itemQuantity + newItemQuantity;

        },

        toggleEditQuantity( state, itemKey ) {
            state.cartdata.line_items[itemKey].editQuantity = !  state.cartdata.line_items[itemKey].editQuantity;
        },

        addDiscount( state, discountData ) {

            state.cartdata.coupon_lines.push({
                name: discountData.title,
                type: 'discount',
                isEdit: false,
                value: discountData.value.amount,
                discount_type: discountData.value.discount_type,
                tax_status: 'incl' !== state.settings.woo_tax.wc_tax_display_shop ? 'taxable' : 'none',
                tax_class: '',
                total: 0,
                code: discountData.value.code,
                product_ids: discountData.value.product_ids,
            });
        },

        addFee( state, feeData ) {
            state.cartdata.fee_lines.push({
                name: feeData.title,
                type: 'fee',
                value: feeData.value.toString(),
                isEdit: false,
                fee_type: feeData.type,
                tax_status: 'yes' === state.settings.wepos_general.enable_fee_tax ? 'taxable' : 'none',
                tax_class: '',
                total: 0,
            });
        },

        saveFeeValue( state, item ) {
            state.cartdata.fee_lines.splice( item.key, 1, item.feeData );
            state.cartdata.fee_lines[item.key].isEdit = false;
        },

        editFeeValue( state, itemKey ) {
            state.cartdata.fee_lines[itemKey].isEdit = true;
        },

        cancelSaveFeeValue( state, itemKey ) {
            state.cartdata.fee_lines[itemKey].isEdit = false;
        },

        removeCouponLineItems( state, itemKey ) {
            state.cartdata.coupon_lines.splice( itemKey, 1 );
        },

        removeFeeLineItems( state, itemKey ) {
            state.cartdata.fee_lines.splice( itemKey, 1 );
        },

        emptyCart( state ) {
            state.cartdata =  {
                line_items: [],
                fee_lines: [],
                coupon_lines: [],
            };
        },
        calculateDiscount(state, payload) {
            if (state.cartdata.coupon_lines.length > 0) {
                state.cartdata.coupon_lines.forEach((item, key) => {
                    if (item.type === "discount") {
                        let discountValue = Math.abs(item.value);
                        if (item.discount_type === 'percent') {
                            state.cartdata.coupon_lines[key].total = `-${(payload.getSubtotal * discountValue) / 100}`;
                        } else if (item.discount_type === 'fixed_product') {
                            const productQuantity = state.cartdata.line_items
                                .filter(product => item.product_ids?.includes(product.product_id))
                                .reduce((total, product) => total + product.quantity, 0);
                            state.cartdata.coupon_lines[key].total = `-${discountValue * productQuantity}`;
                        } else {
                            state.cartdata.coupon_lines[key].total = `-${discountValue}`;
                        }
                    }
                });
            }
        },
        calculateFee( state, payload ) {
            if ( state.cartdata.fee_lines.length > 0 ) {
                weLo_.forEach( state.cartdata.fee_lines, ( item,key ) => {
                    if ( item.type == 'fee' ) {
                        if ( item.fee_type == 'percent' ) {
                            state.cartdata.fee_lines[key].total = ( ( payload.getSubtotal*Math.abs( item.value ) )/100 ).toString();
                        } else {
                            state.cartdata.fee_lines[key].total = Math.abs( item.value ).toString();
                        }
                    }
                } );
            }
        },
    },
    actions: {
        setSettingsAction( context, settings ) {
            context.commit( 'setSettings', settings );
        },

        setAvailableTaxAction( context, availableTax ) {
            context.commit( 'setAvailableTax', availableTax );
        },

        setCartDataAction( context, cartdata ) {
            context.commit( 'setCartData', cartdata );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        addToCartAction( context, product ) {
            context.commit( 'addToCartItem', product );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        removeCartItemAction( context, itemKey ) {
            context.commit( 'removeCartItem', itemKey );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        addItemQuantityAction( context, itemKey ) {
            context.commit( 'addCartItemQuantity', itemKey );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        removeItemQuantityAction( context, itemKey ) {
            context.commit( 'removeCartItemQuantity', itemKey );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        updateCartExpiryItemQuantityAction(context, payload) {
            context.commit( 'updateCartExpiryItemQuantity', payload );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        toggleEditQuantityAction( context, itemKey ) {
            context.commit( 'toggleEditQuantity', itemKey );
        },

        addDiscountAction( context, discountData ) {
            context.commit( 'addDiscount', discountData );
            context.commit( 'calculateDiscount', context.getters );
        },

        addFeeAction( context, feeData ) {
            context.commit( 'addFee', feeData );
            context.commit( 'calculateFee', context.getters );
        },

        removeCouponLineItemsAction( context, itemKey ) {
            context.commit( 'removeCouponLineItems', itemKey );
            context.commit( 'calculateDiscount', context.getters );
        },

        removeFeeLineItemsAction( context, itemKey ) {
            context.commit( 'removeFeeLineItems', itemKey );
            context.commit( 'calculateFee', context.getters );
        },

        saveFeeValueAction( context, feeData ) {
            context.commit( 'saveFeeValue', feeData );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        editFeeValueAction( context, itemKey ) {
            context.commit( 'editFeeValue', itemKey );
        },

        cancelSaveFeeValueAction( context, itemKey ) {
            context.commit( 'cancelSaveFeeValue', itemKey );
        },

        emptyCartAction( context ) {
            context.commit( 'emptyCart' );
        },

        calculateDiscount( context ) {
            context.commit( 'calculateDiscount', context.getters );
        },

        calculateFee( context ) {
            context.commit( 'calculateFee', context.getters );
        }
    }
};
