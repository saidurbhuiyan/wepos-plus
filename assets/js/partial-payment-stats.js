// generate receipt pdf
async function generateReceiptPDF(printdata, settings) {
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
                doc.text(field.text, 11, yPosition);
                yPosition += 5;
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
                doc.text(info, 160, bPosition);
                bPosition += 5
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

    // Add Line Items
     yPosition += 10;
    doc.setFont("Helvetica", "bold");
    doc.text('Product', 11, yPosition);
    doc.text('Quantity', 100, yPosition, {align: 'center'});
    doc.text('Price', 198, yPosition, {align: 'right'});
    yPosition += 10;
    const expiryData = printdata.meta_data?.find(item => item.key === '_wepos_product_expiry_data')?.value;
    printdata.line_items.forEach(item => {
        doc.setFont("Helvetica", "bold");
        doc.text(item.name, 11, yPosition);
        doc.setFont("Helvetica", "normal");
        doc.text(`${item.quantity}`, 100, yPosition, {align: 'center'});

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
                doc.text(`${data.quantity}x ${data.date}`, 14, yPosition);
            });


        }

        const itemTotal = parseFloat(item.total);
        const itemSubtotal = parseFloat(item.subtotal);
        const discount = itemSubtotal - itemTotal;
        if (discount > 0) {
            yPosition += 5;
            doc.setTextColor(117, 133, 152);
            doc.text(`Discount: -${formatPrice(discount.toFixed(2))}`, 12, yPosition);
        }
        doc.setTextColor(0, 0, 0);
        yPosition += 10;
    });

    // Add Subtotal
    const total = parseFloat(printdata.total)
    const discount = parseFloat(printdata.discount_total)
    const subtotal = total + discount
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    yPosition += 5;
    doc.text(`Subtotal:`, 11, yPosition);
    doc.text(formatPrice(subtotal.toFixed(2)), 198, yPosition, {align: 'right'});

    // Add Discounts, Fees, Tax, and Total
    yPosition += 10;

    // Discount
    if (printdata.coupon_lines && printdata.coupon_lines.length > 0) {
        const fixedDiscount = printdata.coupon_lines.some(coupon => coupon.discount_type === "fixed_product")
        if (fixedDiscount) {
            doc.text(`Discount:`, 11, yPosition);
            doc.text(`-${formatPrice(printdata.discount_total)}`, 198, yPosition, {align: 'right'});
            yPosition += 5;
        }else {
            printdata.coupon_lines.forEach(fee => {
                doc.text(`Discount:`, 11, yPosition);
                doc.text(`-${formatPrice(Math.abs(fee.discount))}`, 198, yPosition, {align: 'right'});
                yPosition += 5;
            });
        }
    }

    // Fees
    if (printdata.fee_lines && printdata.fee_lines.length > 0) {
        printdata.fee_lines.forEach(fee => {
            doc.text(`Fee:`, 11, yPosition);
            doc.text(formatPrice(Math.abs(fee.fee)), 198, yPosition, {align: 'right'});
            yPosition += 5;
        });
    }

    // Tax
    if (printdata.total_tax > 0) {
        doc.text(`Tax:`, 11, yPosition);
        doc.text(formatPrice(printdata.total_tax), 198, yPosition, {align: 'right'});
        yPosition += 5;
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

    // Payment Method
    doc.setFont("Helvetica", "normal");
    doc.text('Payment method:', 10, yPosition);
    doc.text(printdata.payment_method_title || '', 198, yPosition, {align: 'right'});
    yPosition += 10;

    // Payment Type
    doc.text('Payment Type:', 10, yPosition);
    doc.text(printdata.meta_data.some((data) => data.key === '_wepos_cash_payment_type' && data.value === 'partial') ? 'Partial Payment' : 'Full Payment', 198, yPosition, {align: 'right'});
    yPosition += 10;

    // Payment Date
    doc.text('Payment Date:', 10, yPosition);
    doc.text(formatDate(printdata.current_payment.date_created), 198, yPosition, {align: 'right'});
    yPosition += 10;

    // total Paid/Due Amount
        // Paid Amount
        doc.setFont("Helvetica", "bold");
        doc.text('Paid Amount:', 10, yPosition);
        doc.text(formatPrice(parseFloat(printdata.current_payment.paid).toFixed(2)), 198, yPosition, {align: 'right'});
        yPosition += 10;

        // past Payments stats
        if (printdata.past_payment && printdata.past_payment.length > 0) {
            // Divider
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
            yPosition += 10;

        }


        // Divider
        doc.setLineDash([1, 1], 0)
        doc.setLineWidth(0,5);
        doc.line(10, yPosition, 200, yPosition);
        yPosition += 10;

        // total Paid
        doc.setFont("Helvetica", "bold");
        doc.text('Total Paid:', 10, yPosition);
        doc.text(formatPrice(printdata.total_partial_paid), 198, yPosition, {align: 'right'});
        yPosition += 10;

    if (printdata.payment_method === 'wepos_cash' && printdata.meta_data.some((data) => data.key === '_wepos_cash_payment_type' && data.value === 'partial') && printdata.total_partial_due > 0) {
        // total Due
        doc.text('Total Due:', 10, yPosition);
        doc.text(formatPrice(printdata.total_partial_due), 198, yPosition, {align: 'right'});
        yPosition += 10;

    }

    if (printdata.total_partial_due <= 0) {
        doc.text('Payment Status:', 10, yPosition);
        doc.text('Fully Paid', 198, yPosition, {align: 'right'});
        yPosition += 10;
    }

    // Add Footer
    yPosition += 20;
    if (settings.wepos_receipts && settings.wepos_receipts.receipt_footer) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = settings.wepos_receipts.receipt_footer;
        document.body.appendChild(tempDiv);

        await doc.html(tempDiv, {
            callback: function (pdf) {
                document.body.removeChild(tempDiv); // Clean up
                return pdf;
            },
            x: 100,  // X position (margin)
            y: yPosition,  // Y position (margin)
            html2canvas: {
                scale: 0.30  // Adjust scale if needed
            }
        });
    }

    // Open PDF in new tab
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl);
}

// Format price
function formatPrice(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

// Convert WP format to DayJS format
function formatDate(dateString) {
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
    return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
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
        let printData = {};
        const partialReceipt = $(e.target.closest('.partial-receipt'))
        const totalPartialPaid = parseFloat(partialReceipt.attr('data-partial-paid')?? 0).toFixed(2);
        const totalPartialDue = parseFloat(partialReceipt.attr('data-partial-due')?? 0).toFixed(2);
        const partialPaymentId = partialReceipt.attr('data-partial-payment-id');
        const {currentPayment, pastPayment} = searchByID(partialPaymentId, partialPaymentData.partialPaymentStats)
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

            await generateReceiptPDF(printData, partialPaymentData.settings);
        } catch (error) {
            console.log(error);
        }

    });
});
