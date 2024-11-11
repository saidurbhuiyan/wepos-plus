<template>
  <button class="pdf-btn" @click.prevent="handleReceiptClick()" :disabled="generating">
    <span class="label">{{ __( generating ? 'Generating PDF...' : 'Share To Whatsapp', 'wepos' ) }}</span>
  </button>
</template>

<script>
import {jsPDF} from "jspdf";

export default {

  name: 'GeneratePdfReceipt',

  props: {
    printdata: {
      type: Object,
      default() {
        return {};
      }
    },
    settings: {
      type: Object,
      default() {
        return {};
      }
    }
  },

  data() {
    return {
      generating : false
    };
  },

  methods: {
    async uploadPDF(pdfBlob, filename) {
      const formData = new FormData();
      formData.append("file", pdfBlob, filename);

      try {
        const data = await wepos.api.get(`${wepos.rest.root}wp/v2/media?search=${filename}`).promise();

        if (data.length > 0 && data[0].media_details.filesize === formData.get('file').size) {
          return data[0].source_url;
        }
          if(data.length > 0) {
            await this.deletePDF(data[0].id);
          }
          return await this.createPDF(formData);

      } catch (error) {
        console.error("Error:", error);
        return null;
      }
    },
    async deletePDF(pdfId) {
      try {
        const response = await wepos.api.delete(`${wepos.rest.root}wp/v2/media/${pdfId}?force=true`).promise();
        return response.deleted;
      } catch (error) {
        console.error("Error:", error);
        return null;
      }
    },
    async createPDF(formData) {
      try {
        const response = await wepos.api.post(`${wepos.rest.root}wp/v2/media`, formData).promise();
        return response.source_url;
      } catch (error) {
        console.error("Error:", error);
        return null;
      }
    },


    formatPrice(amount) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  },

  formatDate(dateString, format = null) {
    const date = new Date(dateString);
    const options = {
      "d/m/Y": {year: "numeric", month: "2-digit", day: "2-digit"},
    };
    const formatOptions = options[format] || {year: "numeric", month: "long", day: "numeric"};
    return new Intl.DateTimeFormat("en-US", formatOptions).format(date);
  },

  async generateReceiptPDF(printdata, settings, phoneNumber = null) {
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
    doc.text(`Order ID: #${printdata.order_id}`, 11, yPosition);
    doc.text(`Order Date: ${new Date(printdata.order_date).toLocaleString()}`, 198, yPosition, {align: 'right'});

    // Divider
    yPosition += 5;
    doc.setLineDash([1, 1], 0)
    doc.setLineWidth(0,5);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 10;

    // Add Line Items
    doc.setFont("Helvetica", "bold");
    doc.text('Product', 11, yPosition);
    doc.text('Price', 100, yPosition, {align: 'center'});
    doc.text('Quantity', 145, yPosition, {align: 'center'});
    doc.text('Total', 198, yPosition, {align: 'right'});

    printdata.line_items.forEach(item => {
      doc.setFontSize( 8 );
      yPosition += 5;
      let price = item.vendor_type === 'local'? item.local_price : item.regular_price
      price = item.vendor_type === 'export' ? item.export_price : price
      price = item.on_sale ? item.sale_price : price
      doc.setFont("Helvetica", "bold");
      doc.text(item.name, 11, yPosition);
      doc.setFont("Helvetica", "normal");
      doc.text(this.formatPrice(price), 100, yPosition, {align: 'center'});
      doc.text(`${item.quantity}`, 145, yPosition, {align: 'center'});
      doc.text(this.formatPrice(item.quantity*price), 198, yPosition, {align: 'right'});
      doc.setFontSize(7);

        // Add attributes
      if (item.attribute && item.attribute.length > 0) {
        let previousWidth = 12;
        item.attribute.forEach(attribute_item => {
          if(attribute_item?.key?.startsWith("pa_")){
            yPosition += 2;
            // Set color for the display key
            doc.setTextColor(117, 133, 152); // Gray color
            doc.text(`${attribute_item.name}: `, previousWidth, yPosition, { baseline: 'top' });

            // Get the width of the display key to set position for the value
            const keyWidth = doc.getTextWidth(`${attribute_item.name}: `);

            // Set color for the display value
            doc.setTextColor(0, 0, 0); // Black color
            doc.text(`${attribute_item.option}`, previousWidth + keyWidth, yPosition, { baseline: 'top' });
            const valueWidth = doc.getTextWidth(`${attribute_item.option}: `);
            previousWidth = previousWidth + keyWidth + valueWidth;
          }
        });
      }

      // Add Expiry
      if (item.expiry && item.expiry.length > 0) {
        yPosition += 7;
        doc.setTextColor(117, 133, 152);
        doc.text(`Expiry: `, 12, yPosition);
        doc.setTextColor(0, 0, 0);
        item.expiry.forEach(data => {
          yPosition += 5;
          doc.text(`${data.quantity}x ${this.formatDate(data.date, 'd/m/Y')}`, 14, yPosition);
        });
      }

      const discount = printdata.coupon_lines
          .filter(coupon => typeof coupon.product_ids !== 'undefined' && coupon.product_ids.includes(item.product_id));
      if (discount && discount.length > 0) {
        yPosition += 5;
        doc.setTextColor(117, 133, 152);
        doc.text(`Discount: ${parseFloat(discount[0].total).toFixed(2) + ' ' + wepos.currency_format_symbol + (Math.abs(parseFloat(discount[0].total)).toFixed(2) !== parseFloat(discount[0].value).toFixed(2) ? ' (' + item.quantity + 'x' + discount[0].value  + ')': '')}`, 12, yPosition);
      }
      doc.setTextColor(0, 0, 0);
    });

    // Add Subtotal
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    yPosition += 10;
    doc.text(`Subtotal:`, 11, yPosition);
    doc.setFont("Helvetica", "normal");
    doc.text(this.formatPrice(printdata.subtotal), 198, yPosition, {align: 'right'});

    // Add Discounts, Fees, Tax, and Total
    // Discount
    if (printdata.coupon_lines && printdata.coupon_lines.length > 0) {
      const fixedDiscount = printdata.coupon_lines.some(coupon => coupon.discount_type === "fixed_product")
      yPosition += 5
      if (fixedDiscount) {
        const totalDiscount =  printdata.coupon_lines
            .filter(coupon => coupon.discount_type === 'fixed_product')
            .map(coupon => parseFloat(coupon.total))
            .reduce((sum, value) => sum + value, 0)
        doc.setFont("Helvetica", "bold");
        doc.text(`Discount:`, 11, yPosition);
        doc.setFont("Helvetica", "normal");
        doc.text(`-${this.formatPrice(Math.abs( totalDiscount ).toFixed(2))}`, 198, yPosition, {align: 'right'});;
      }else {
        printdata.coupon_lines.forEach(fee => {
          doc.setFont("Helvetica", "bold");
          doc.text(`Discount: ${ (fee.discount_type === 'percent' ? fee.value + '%' : formatPrice( fee.value )) }`, 11, yPosition);
          doc.setFont("Helvetica", "normal");
          doc.text(`-${this.formatPrice(Math.abs(fee.total))}`, 198, yPosition, {align: 'right'});
        });
      }
    }

    // Fees
    if (printdata.fee_lines && printdata.fee_lines.length > 0) {
      printdata.fee_lines.forEach(fee => {
        yPosition += 5;
        doc.setFont("Helvetica", "bold");
        doc.text(`Fee:`, 11, yPosition);
        doc.setFont("Helvetica", "normal");
        doc.text(this.formatPrice(Math.abs(fee.fee)), 198, yPosition, {align: 'right'});
      });
    }

    // Tax
    if (printdata.taxtotal > 0) {
      yPosition += 5;
      doc.setFont("Helvetica", "bold");
      doc.text(`Tax:`, 11, yPosition);
      doc.setFont("Helvetica", "normal");
      doc.text(this.formatPrice(printdata.taxtotal), 198, yPosition, {align: 'right'});
    }

    // Order Total
    yPosition += 5;
    doc.setFont("Helvetica", "bold");
    doc.text(`Order Total:`, 11, yPosition);
    doc.setFont("Helvetica", "normal");
    doc.text(this.formatPrice(printdata.ordertotal), 198, yPosition, {align: 'right'});

    // Divider
    yPosition += 10;
    doc.setLineDash([1, 1], 0)
    doc.setLineWidth(0,5);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 10;

    // Vendor Type
    const vendorType = printdata.vendor_type ? printdata.vendor_type : 'regular'

    doc.setFont("Helvetica", "normal");
    doc.text('Vendor Type:', 10, yPosition);
    doc.text(vendorType.charAt(0).toUpperCase() + vendorType.slice(1), 198, yPosition, {align: 'right'});

    // Payment Method
    yPosition += 5;
    doc.setFont("Helvetica", "normal");
    doc.text('Payment method:', 10, yPosition);
    doc.text(printdata.gateway.title || '', 198, yPosition, {align: 'right'});

    // Payment Type
    yPosition += 5;
    doc.text('Payment Type:', 10, yPosition);
    doc.text(printdata.paymenttype  === 'partial' ? 'Partial Payment' : 'Full Payment', 198, yPosition, {align: 'right'});

    // total Paid/Due Amount
    if (printdata.gateway.id === 'wepos_cash' || printdata.gateway.id === 'wepos_card') {
      //cash given
      yPosition += 5;
      doc.setFont("Helvetica", "normal");
      doc.text(printdata.gateway.id==='wepos_cash' ?'Cash Given:' : 'Paid Amount:', 10, yPosition);
      doc.text(this.formatPrice(parseFloat(printdata.cashamount).toFixed(2)), 198, yPosition, {align: 'right'});

      if (printdata.paymenttype === 'partial' && printdata.dueamount > 0) {
        // Due amount
        yPosition += 5;
        doc.text('Due Amount:', 10, yPosition);
        doc.text(this.formatPrice(printdata.dueamount), 198, yPosition, {align: 'right'});

      }else{
        yPosition += 5;
        // change money
        doc.setFont("Helvetica", "normal");
        doc.text('Change Money:', 10, yPosition);
        doc.text(this.formatPrice(printdata.changeamount), 198, yPosition, {align: 'right'});

      }

      //payment status
      if (printdata.dueamount <= 0) {
        yPosition += 5;
        doc.text('Payment Status:', 10, yPosition);
        doc.text('Fully Paid', 198, yPosition, {align: 'right'});
      }
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
   const pdfUrl = await this.uploadPDF(pdfBlob, 'receipt-order-' + printdata.order_id+'-'+ (printdata.partial_Payment_id ?? 0) + '.pdf');
    // Open PDF in new tab as default action
    let actionUrl = pdfUrl;
    //share to whatsapp
      const whatsappMessage = encodeURIComponent("Check out Your Order Receipt: " + pdfUrl);
      actionUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;
      if(phoneNumber && phoneNumber !== '') {
        actionUrl += `&phone=${phoneNumber}`;
      }

    // Open PDF in new tab in preferred action
    window.open(actionUrl, "_blank");
  },

    async handleReceiptClick() {
        this.generating = true;
        let phoneNumber = this.printdata.billing.phone ?? '';
        let setPhoneNumber = '';

        if (phoneNumber === '' || confirm("Do you want to use another phone number to send the receipt?")) {
          setPhoneNumber = prompt("Please enter the phone number with country code (example +351) to send the receipt:");
        }

        if (setPhoneNumber) {
          phoneNumber = setPhoneNumber.replaceAll(/\s/g, '');
        }

        if (phoneNumber !== '') {
          phoneNumber = phoneNumber.replaceAll('+', '');
          await this.generateReceiptPDF(this.printdata, this.settings, phoneNumber);  // Make sure to await the PDF generation process
        }

        this.generating = false;
    }
  }
}
</script>

<style scoped lang="less">
.pdf-btn{
  background: #16A085;
  border: 1px solid #16A085;
  margin: 4px !important;

}

.pdf-btn:disabled {
  background: #38c8ac;
  border: 1px solid #38c8ac;
  cursor: progress;
}
</style>