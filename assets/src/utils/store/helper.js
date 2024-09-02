export default {
    hasStock( product, productCartQty = 0 ) {
        if ( ! product.manage_stock ) {
            return ( 'outofstock' == product.stock_status ) ? false : true;
        } else {
            if ( product.backorders_allowed ) {
                return true;
            } else {
                return product.stock_quantity > productCartQty;
            }
        }
    },

    hasExpiryStock(product, expiryDate, quantity) {
        const expiry = product.stock_expiry?.find(item => item.date === expiryDate);
        return parseInt(expiry?.quantity) >= quantity;
    }

};