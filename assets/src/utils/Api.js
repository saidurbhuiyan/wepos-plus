class WePos_API  {

    headers() {
        return {
        }
    }

    get( path, data = {}, headers = {} ) {
        return this.ajax(path, 'GET', headers, data);
    }

    post(path, data = {} ) {
        return this.ajax(path, 'POST', this.headers(), data);
    }

    put(path, data = {} ) {
        return this.ajax(path, 'PUT', this.headers(), data);
    }

    delete(path, data = {} ) {
        return this.ajax(path, 'DELETE', this.headers(), data);
    }

    // jQuery ajax wrapper
    ajax(path, method, headers, data) {
        let override = null;
        let isFormData = data instanceof FormData;

        if ( 'PUT' === method || 'DELETE' === method ) {
            override = method;
            method   = 'POST';
        }

        return jQuery.ajax({
            url: path,
            processData: !isFormData,
            contentType: isFormData ? false : 'application/x-www-form-urlencoded',
            beforeSend: function ( xhr ) {
                xhr.setRequestHeader( 'X-WP-Nonce', window.wepos.rest.nonce );

                if ( override ) {
                    xhr.setRequestHeader( 'X-HTTP-Method-Override', override );
                }
            },
            type: method,
            data: data
        });
    }
}

export default WePos_API;
