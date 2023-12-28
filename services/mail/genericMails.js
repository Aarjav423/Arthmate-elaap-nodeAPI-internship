const genericMails = (type, data) => {
  switch (type) {
    case 'createuser':
      return `<div>Hi ${data.username},<br><br>
            Welcome to the ELAAP Dashborad.<br>
            PFB, the dashboard credentials.<br><br>
            <label><b>URL : </b></label>${process.env.ELAAP_DASH_URL}<br>
            <label><b>email : </b></label>${data.email}<br>
            <label><b>password : </b></label>${data.userpassToEmail}<br><br>
            </div>`;
      break;
    case 'passwordreset':
      return `<div>Hi ${data.username},<br><br>
            Your password successfully changed.<br>
            PFB, the new credentials for dashboard.<br><br>
            <label><b>URL : </b></label>${process.env.ELAAP_DASH_URL}<br>
            <label><b>email : </b></label>${data.email}<br>
            <label><b>password : </b></label>${data.confirmPassword}<br><br>
            Regards,<br>
            ARTHMATETECH PRIVATE LIMITED</div>`;
      break;
    case 'reject_loan':
      return `<div>Hi ${data.user_name},<br><br>
            Your Loan has been rejected.<br>
            <label><b>Bookking Loan Id : </b></label>${data.loan_id}<br>
            <label><b>Bookking Borrower Id : </b></label>${data.borrower_id}<br>
            <label><b>Rejected Reasons : </b></label> <br>
            ${data.reason.split(',').map((item, i) => {
              return `${i + 1}) ${item} <br>`.replace(',', '');
            })} <br>
            <label><b>Rejected By : </b></label>${data.rejected_by}<br>
            Regards,<br>
            ARTHMATETECH PRIVATE LIMITED</div>`;
      break;
    case 'credit_approved':
      return `<div>Hi ${data.user_name},<br><br>
            Loan has been credit approved for below customer.<br>
            <label><b>Customer Name : </b></label>${data.name}<br>
            <label><b>Bookking Loan Id : </b></label>${data.id}<br>
            <label><b>Sanction Amount : </b></label>${data.sanction_amount}<br>
            Regards,<br>
            ARTHMATETECH PRIVATE LIMITED</div>`;
      break;
    case 'creditline_Manage':
      return `<div>Hi ${data.user_name},<br><br>
            Creditline has been managed for below customers.<br><br>
            <div><b>Product Name: </b> ${data.product_name},<br><br>
            ${
              data && data.manage_data
                ? data.manage_data.map((row, i) => {
                    return `<label><b>Customer Details :- </b></label><br>
                 <label><b>Bookking Loan Id : </b></label>${row.loan_id}<br>
                 <label><b>Bookking Borrower Id : </b></label>${row.borrower_id}<br>
                 <label><b>Partner Loan Id : </b></label>${row.partner_loan_id}<br>
                 <label><b>Partner Borrower Id : </b></label>${row.partner_borrower_id}<br>
                 <label><b>Opening Balance : </b></label>${row.opening_bal}<br>
                 <label><b>Usable Balance : </b></label>${row.usable_balance}<br><br>`;
                  })
                : null
            }
            <br>Regards,<br>
            ARTHMATETECH PRIVATE LIMITED</div>`;
      break;
    case 'open':
      return `<div>Hi ${data.user_name},<br><br>
            Loan has been moved to ${type} for below customers. This change was approved and made by ${data.username}<br><br>
            <div><b>Product Name: </b> ${data.product_name},<br><br>
            <label><b>Borrower Details :- </b></label><br>
              <label><b>Name : </b></label>${data.borrower_name}<br>
             <label><b>Bookking Loan Id : </b></label>${data.loan_id}<br>
             <label><b>Bookking Borrower Id : </b></label>${data.borrower_id}<br>
             <label><b>Partner Loan Id : </b></label>${data.partner_loan_id}<br>
             <label><b>Partner Borrower Id : </b></label>${data.partner_borrower_id}<br>
             <br>Regards,<br>
             ARTHMATETECH PRIVATE LIMITED</div>`;
      break;
    case 'cbiLoanStatusUpdate':
      return `<div>
               Hi Team,<br><br>
               <b> Loan Number ${data.loan_id} is ${data.status}.</b><br><br>
               <div><b>Comment: </b> ${data.remarks}.<br><br>
               <br>Regards,<br>
                Team Arthmate
              </div>`;
      break;
    default:
      break;
  }
};

module.exports = {
  genericMails,
};
