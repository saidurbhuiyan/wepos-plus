// upload pdf
async function uploadPDF(pdfBlob, filename) {
    const formData = new FormData();
    formData.append('file', pdfBlob, filename);

    // Check for existing PDF by filename
    try {
        const response = await fetch(weposData.mediaUrl + '?search=' + filename, {
            method: 'GET',
            headers: {
                'X-WP-Nonce': weposData.nonce, // Send the nonce here
            }
        });

        const data = await response.json();
        if (data.length > 0 && data[0].media_details.filesize === formData.get('file').size) {
            return data[0].source_url;
        }
        if(data.length > 0) {
          await deletePDF(data[0].id);
        }
            return await createPDF(formData);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deletePDF(pdfId) {
    try {
        const response = await fetch(weposData.mediaUrl + `/${pdfId}?force=true`, {
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': weposData.nonce, // Include the nonce in the request headers
            }
        });

        const data = await response.json();
        return data.deleted;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function createPDF(formData) {
    try {
        const response = await fetch(weposData.mediaUrl, {
            method: 'POST',
            headers: {
                'X-WP-Nonce': weposData.nonce, // Include the nonce in the request headers
            },
            body: formData
        });

        const data = await response.json();
        return data.source_url;
    } catch (error) {
        console.error('Error:', error);
    }
}

// generate receipt pdf
async function generateReceiptPDF(printdata, settings, partialPaymentId,actionType = 'generate-receipt', phoneNumber = null) {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    let yPosition = 20;
    doc.setFontSize(8);
    doc.setFont("Helvetica", "normal");

    // Add customer Header
    let bPosition = yPosition;
    if (printdata.billing){
        const billingFields = [
            { condition: printdata.customer_id, text: 'Customer ID: #' + printdata.customer_id },
            { condition: printdata.billing.first_name || printdata.billing.last_name, text: (printdata.billing.first_name || '') + ' ' + (printdata.billing.last_name || '') },
            { condition: printdata.billing.email, text: printdata.billing.email },
            { condition: printdata.billing.phone, text: 'Phone: ' + printdata.billing.phone },
            { condition: printdata.billing.nif, text: 'NIF: ' + printdata.billing.nif },
            { condition: printdata.billing.address_1, text: printdata.billing.address_1 }
        ];

        // Iterate over each field and print if it exists
        billingFields.forEach(field => {
            if (field.condition) {
                yPosition += 5;
                doc.text(field.text, 11, yPosition);
            }
        });
    }

    // Add company Header
    if (settings.wepos_receipts && settings.wepos_receipts.receipt_header) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = settings.wepos_receipts.receipt_header.trim();
        const companyInfo = Array.from(tempDiv.querySelectorAll('p')).map(p => p.textContent.trim())

        if (companyInfo.length > 0) {
            companyInfo.forEach(info => {
                bPosition += 5;
                doc.text(info, 198, bPosition, {align: 'right'});
            })
        }
    }

    // Add Order Info
    yPosition = (yPosition < bPosition ? bPosition : yPosition) + 10;
    doc.text(`Order ID: #${printdata.id}`, 11, yPosition);
    doc.text(`Order Date: ${new Date(printdata.date_created).toLocaleString()}`, 198, yPosition, {align: 'right'});

    // Divider
    yPosition += 5;
    doc.setLineDash([1, 1], 0)
    doc.setLineWidth(0,5);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 10;

    // Add Line Items
    doc.setFont("Helvetica", "bold");
    doc.text('Product', 11, yPosition);
    doc.text('Cost', 100, yPosition, {align: 'center'});
    doc.text('Quantity', 145, yPosition, {align: 'center'});
    doc.text('Total', 198, yPosition, {align: 'right'});

    const expiryData = printdata.meta_data?.find(item => item.key === '_wepos_product_expiry_data')?.value;
    printdata.line_items.forEach(item => {
        yPosition += 5;
        doc.setFont("Helvetica", "bold");
        doc.text(item.name, 11, yPosition);
        doc.setFont("Helvetica", "normal");
        doc.text(formatPrice(item.price), 100, yPosition, {align: 'center'});
        doc.text(`${item.quantity}`, 145, yPosition, {align: 'center'});
        doc.text(formatPrice(item.subtotal), 198, yPosition, {align: 'right'});

        // Add attributes
        if (item.meta_data && item.meta_data.length > 0) {
            yPosition += 2;
            doc.setFontSize(7);
            let previousWidth = 12;
            item.meta_data.forEach(attribute_item => {
                if(attribute_item.key.startsWith("pa_")){
                    // Set color for the display key
                    doc.setTextColor(117, 133, 152); // Gray color
                    doc.text(`${attribute_item.display_key}: `, previousWidth, yPosition, { baseline: 'top' });

                    // Get the width of the display key to set position for the value
                    const keyWidth = doc.getTextWidth(`${attribute_item.display_key}: `);

                    // Set color for the display value
                    doc.setTextColor(0, 0, 0); // Black color
                    doc.text(`${attribute_item.display_value}`, previousWidth + keyWidth, yPosition, { baseline: 'top' });
                    const valueWidth = doc.getTextWidth(`${attribute_item.display_value}: `);
                    previousWidth = previousWidth + keyWidth + valueWidth;
                }
            });
        }

        // Add Expiry
        const expiry = expiryData?.find(data => parseInt(data?.product_id) === parseInt(item?.product_id))?.expiry;
        if (expiry) {
            yPosition += 7;
            doc.setTextColor(117, 133, 152);
            doc.text(`Expiry: `, 12, yPosition);
            doc.setTextColor(0, 0, 0);
            expiry.forEach(data => {
                yPosition += 5;
                doc.text(`${data.quantity}x ${formatDate(data.date, 'd/m/Y')}`, 14, yPosition);
            });
        }

        const itemTotal = parseFloat(item.total);
        const itemSubtotal = parseFloat(item.subtotal);
        const discount = itemSubtotal - itemTotal;
        const perDiscount = (discount / item.quantity).toFixed(2);
        if (discount > 0) {
            yPosition += 5;
            doc.setTextColor(117, 133, 152);
            doc.text(`Discount: -${formatPrice(discount.toFixed(2)) + ' (' + item.quantity + 'x' + perDiscount  + ')'}`, 12, yPosition);
        }
        doc.setTextColor(0, 0, 0);
    });

    // Add Subtotal
    const total = parseFloat(printdata.total)
    const discount = parseFloat(printdata.discount_total)
    const subtotal = total + discount
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    yPosition += 10;
    doc.text(`Subtotal:`, 11, yPosition);
    doc.text(formatPrice(subtotal.toFixed(2)), 198, yPosition, {align: 'right'});

    // Add Discounts, Fees, Tax, and Total
    // Discount
    if (printdata.coupon_lines && printdata.coupon_lines.length > 0) {
        const fixedDiscount = printdata.coupon_lines.some(coupon => coupon.discount_type === "fixed_product")
        yPosition += 5
        if (fixedDiscount) {
            doc.text(`Discount:`, 11, yPosition);
            doc.text(`-${formatPrice(printdata.discount_total)}`, 198, yPosition, {align: 'right'});;
        }else {
            printdata.coupon_lines.forEach(fee => {
                doc.text(`Discount:`, 11, yPosition);
                doc.text(`-${formatPrice(Math.abs(fee.discount))}`, 198, yPosition, {align: 'right'});
            });
        }
    }

    // Fees
    if (printdata.fee_lines && printdata.fee_lines.length > 0) {
        printdata.fee_lines.forEach(fee => {
            yPosition += 5;
            doc.text(`Fee:`, 11, yPosition);
            doc.text(formatPrice(Math.abs(fee.fee)), 198, yPosition, {align: 'right'});
        });
    }

    // Tax
    if (printdata.total_tax > 0) {
        yPosition += 5;
        doc.text(`Tax:`, 11, yPosition);
        doc.text(formatPrice(printdata.total_tax), 198, yPosition, {align: 'right'});
    }

    // Order Total
    yPosition += 5;
    doc.setFont("Helvetica", "bold");
    doc.text(`Order Total:`, 11, yPosition);
    doc.text(formatPrice(printdata.total), 198, yPosition, {align: 'right'});

    // Divider
    yPosition += 10;
    doc.setLineDash([1, 1], 0)
    doc.setLineWidth(0,5);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 10;

    // Vendor Type
    let vendorType = printdata.meta_data.find((data) => data.key === '_wepos_vendor_type')
    vendorType = vendorType && vendorType.value ? vendorType.value : 'regular'

    doc.setFont("Helvetica", "normal");
    doc.text('Vendor Type:', 10, yPosition);
    doc.text(vendorType.charAt(0).toUpperCase() + vendorType.slice(1), 198, yPosition, {align: 'right'});

    // Payment Method
    yPosition += 5;
    doc.setFont("Helvetica", "normal");
    doc.text('Payment method:', 10, yPosition);
    doc.text(printdata.payment_method_title || '', 198, yPosition, {align: 'right'});

    // Payment Type
    yPosition += 5;
    doc.text('Payment Type:', 10, yPosition);
    doc.text(printdata.meta_data.some((data) => data.key === '_wepos_cash_payment_type' && data.value === 'partial') ? 'Partial Payment' : 'Full Payment', 198, yPosition, {align: 'right'});

    // Payment Date
    yPosition += 5;
    doc.text('Payment Date:', 10, yPosition);
    doc.text(formatDate(printdata.current_payment.date_created), 198, yPosition, {align: 'right'});

    // total Paid/Due Amount
        // Paid Amount
        yPosition += 5;
        doc.setFont("Helvetica", "bold");
        doc.text('Paid Amount:', 10, yPosition);
        doc.text(formatPrice(parseFloat(printdata.current_payment.paid).toFixed(2)), 198, yPosition, {align: 'right'});

        // past Payments stats
        if (printdata.past_payment && printdata.past_payment.length > 0) {
            // Divider
            yPosition += 10;
            doc.setLineDash([1, 1], 0)
            doc.setLineWidth(0,5);
            doc.line(10, yPosition, 200, yPosition);
            yPosition += 10;

            doc.setFont("Helvetica", "bold");
            doc.text('Past Payments:', 11, yPosition);
            doc.setFont("Helvetica", "normal");

            printdata.past_payment.forEach(payment => {
                yPosition += 5;
                doc.text(formatDate(payment.date_created), 13, yPosition);
                doc.text(formatPrice(parseFloat(payment.paid).toFixed(2)), 198, yPosition, {align: 'right'});
            });

        }


        // Divider
        yPosition += 10;
        doc.setLineDash([1, 1], 0)
        doc.setLineWidth(0,5);
        doc.line(10, yPosition, 200, yPosition);
        yPosition += 10;

        // total Paid
        doc.setFont("Helvetica", "bold");
        doc.text('Total Paid:', 10, yPosition);
        doc.text(formatPrice(printdata.total_partial_paid), 198, yPosition, {align: 'right'});

    if (printdata.payment_method === 'wepos_cash' && printdata.meta_data.some((data) => data.key === '_wepos_cash_payment_type' && data.value === 'partial') && printdata.total_partial_due > 0) {
        // total Due
        yPosition += 5;
        doc.text('Total Due:', 10, yPosition);
        doc.text(formatPrice(printdata.total_partial_due), 198, yPosition, {align: 'right'});

    }

    if (printdata.total_partial_due <= 0) {
        yPosition += 5;
        doc.text('Payment Status:', 10, yPosition);
        doc.text('Fully Paid', 198, yPosition, {align: 'right'});
    }

    yPosition += 25;
    doc.setFont("Helvetica", "normal");
    doc.setLineDash([])
    doc.setLineWidth(0.2,5);
    doc.line(8, yPosition, 28, yPosition);
    doc.text('Prepared by', 10, yPosition+4, {align: 'left'});

    doc.setFont("Helvetica", "normal");
    doc.setLineDash([])
    doc.setLineWidth(0.2,5);
    doc.line(90, yPosition, 110, yPosition);
    doc.text('Delivered by', 100, yPosition+4, {align: 'center'});

    doc.setFont("Helvetica", "normal");
    doc.setLineDash([])
    doc.setLineWidth(0.2,5);
    doc.line(180, yPosition, 200, yPosition);
    doc.text('Reviewed by', 198, yPosition+4, {align: 'right'});

    // Add Footer
    if (settings.wepos_receipts && settings.wepos_receipts.receipt_footer) {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height
            ? pageSize.height
            : pageSize.getHeight();

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = settings.wepos_receipts.receipt_footer.trim();
        const companyInfo = Array.from(tempDiv.querySelectorAll('p')).map(p => p.textContent.trim())

        if (companyInfo.length > 0) {
            companyInfo.forEach(info => {
                doc.text(info, 100, pageHeight - 10, {align: 'center'});
            })
        }
    }

    // Open PDF in new tab
    const pdfBlob = doc.output('blob');
    // upload or replace PDF
    const pdfUrl = await uploadPDF(pdfBlob, 'receipt-order-' + printdata.id+'-'+ partialPaymentId + '.pdf');
    //const pdfUrl = URL.createObjectURL(pdfBlob);
    // Open PDF in new tab as default action
    let actionUrl = pdfUrl;
    //share to whatsapp
    if(actionType === 'share-whatsapp') {
        const whatsappMessage = encodeURIComponent("Check out Your Order Receipt: " + pdfUrl);
        actionUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;
        if(phoneNumber && phoneNumber !== '') {
            phoneNumber = phoneNumber.replaceAll('+', '');
            actionUrl += `&phone=${phoneNumber}`;
        }
    }

    if (actionType === 'share-email') {
        const emailSubject = encodeURIComponent("Your Order Receipt");
        const emailBody = encodeURIComponent("Hello,\n\nPlease check out your order receipt attached: " + pdfUrl);
        actionUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;
    }

    // Open PDF in new tab in preferred action
    window.open(actionUrl, "_blank");
}

// Format price
function formatPrice(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

// Convert WP format to DayJS format
function formatDate(dateString, format = null) {
    const date = new Date(dateString);

    // Mapping of PHP to JavaScript Intl options
    const options = {
        'F j, Y': { year: 'numeric', month: 'long', day: 'numeric' },         // March 10, 2024
        'Y-m-d': { year: 'numeric', month: '2-digit', day: '2-digit' },       // 2024-03-10
        'm/d/Y': { year: 'numeric', month: '2-digit', day: '2-digit' },       // 03/10/2024
        'd/m/Y': { year: 'numeric', month: '2-digit', day: '2-digit' },       // 10/03/2024
        'M j, Y': { year: 'numeric', month: 'short', day: 'numeric' },        // Mar 10, 2024
        'jS F Y': {},                                                         // 10th March 2024 (custom handling needed)
        'l, F j, Y': {},                                                      // Sunday, March 10, 2024 (custom handling)
        'D, M j, Y': {},                                                      // Sun, Mar 10, 2024 (custom handling)
        'g:i a': { hour: 'numeric', minute: 'numeric', hour12: true },        // 3:00 pm
        'g:i A': { hour: 'numeric', minute: 'numeric', hour12: true },        // 3:00 PM
        'H:i': { hour: '2-digit', minute: '2-digit', hour12: false },         // 15:00
        'H:i:s': { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }, // 15:00:00
    };

    // Retrieve the desired format options
    const formatOptions = options[partialPaymentData.dateFormat] || { year: 'numeric', month: 'long', day: 'numeric' };

    // Use Intl.DateTimeFormat to format the date
    return new Intl.DateTimeFormat('en-US', format ?? formatOptions).format(date);
}


// Search by ID
function searchByID(currentID, partialPaymentStats) {
    // Find the object with the current ID
    const currentItem = partialPaymentStats.find(item => parseInt(item.ID) === parseInt(currentID));

    if (!currentItem) {
        // Return an empty object if no matching ID is found
        return { currentPayment: null, pastPayment: [] };
    }

    // Find all past items with IDs less than the current ID
    const pastItems = partialPaymentStats.filter(item => parseInt(item.ID) < parseInt(currentID))
        .reverse();

    return {
        currentPayment: currentItem,
        pastPayment: pastItems
    };
}

jQuery(document).ready(function($) {
    $('.partial-payment-stats').on('click', async function(e) {
        e.preventDefault();
        if (!e.target.classList.contains('partial-receipt') && !e.target.parentNode.classList.contains('partial-receipt')) {
           return;
        }

        //start process
        let generateReceipt = $('#generating-receipt');
        let receiptAction = $('#receipt-actions');
        generateReceipt.show();
        receiptAction.hide();

        let printData = {};
        const partialReceipt = $(e.target.closest('.partial-receipt'))
        const totalPartialPaid = parseFloat(partialReceipt.attr('data-partial-paid')?? 0).toFixed(2);
        const totalPartialDue = parseFloat(partialReceipt.attr('data-partial-due')?? 0).toFixed(2);
        const partialPaymentId = partialReceipt.attr('data-partial-payment-id');
        const {currentPayment, pastPayment} = searchByID(partialPaymentId, partialPaymentData.partialPaymentStats)
        const actionType = partialReceipt.attr('data-action-type');

        try {
            printData = await $.ajax({
                type: 'POST',
                url: `${weposData.orderUrl}/${partialPaymentData.orderId}`,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', weposData.nonce); // Set nonce header for security
                }
            });
            printData.total_partial_paid = totalPartialPaid;
            printData.total_partial_due = totalPartialDue;
            printData.current_payment = currentPayment;
            printData.past_payment = pastPayment;

            const parser = new DOMParser(),
                dom = parser.parseFromString(partialPaymentData.settings.wepos_receipts.receipt_header, "text/html");
            let phoneNumber = printData.billing.phone ?? '';
            if (actionType === 'share-whatsapp' && phoneNumber === '') {
                const setPhoneNumber = prompt("Please enter the phone number with country code (example +351) to send the receipt:");
                if (setPhoneNumber) {
                    phoneNumber = setPhoneNumber.replaceAll(/\s/g,'');
                }
            }

            if (actionType !== 'share-whatsapp' || (actionType === 'share-whatsapp' && phoneNumber !== '')) {
                await generateReceiptPDF(printData, partialPaymentData.settings, partialPaymentId, actionType, phoneNumber);
            }

        } catch (error) {
            console.log(error);
        }

        //end process
        generateReceipt.hide();
        receiptAction.show();

    });
});
