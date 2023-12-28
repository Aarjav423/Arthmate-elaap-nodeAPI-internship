const { BaseService } = require('../common');
const { SectionSchema } = require('../models');

class SectionStatusService extends BaseService {
  constructor() {
    super(SectionSchema);
  }

  updateSectionStatus = async (filter, status) => {
    const update = await this.model.updateMany(
      filter, // Criteria to select documents
      { $set: { section_status: status } },
    );

    return update;
  };

  changeStatus = async (loan_app_id, section_code, section_status) => {
    const updatedData = await this.model.updateMany({ loan_app_id, section_code: { $in: section_code } }, { $set: { section_status: section_status } }, {new:true});
    return updatedData;
  };

  changeStatusBySequenceNo = async (loan_app_id,section_sequence_no,status) => {
    const updatedData = await this.model.updateMany(
      { loan_app_id, section_sequence_no },
      { $set: { section_status: status } }
      );
      return updatedData;
  }

  addSubsection = async (loanAppId, sectionCode, sectionSequenceNo, subSectionData) => {
    const found = await this.model.findOne({
      loan_app_id: loanAppId,
      section_code: sectionCode,
      section_sequence_no: sectionSequenceNo,
      'subsections.sub_section_code': subSectionData.sub_section_code,
    });

    if (!found) {
      return await this.model.update({ loan_app_id: loanAppId, section_code: sectionCode, section_sequence_no: sectionSequenceNo }, { $push: {subsections:subSectionData} });
    } else {
      let payload = {};
      for (const key of Object.keys(subSectionData)) {
        payload[`subsections.$.${key}`] = subSectionData[key];
      }
      if(payload[`subsections.$.sub_section_sequence_no`]) delete(payload[`subsections.$.sub_section_sequence_no`]);
      return await this.model.updateOne(
        { loan_app_id: loanAppId, section_code: sectionCode, section_sequence_no: sectionSequenceNo, 'subsections.sub_section_code': subSectionData.sub_section_code },
        { $set: payload },
        {
          new: true,
        },
      );
    }
  };

  deleteSubsection= async (loanAppId,sectionSequenceNo,subSectionCode)=>{
    const doc = await this.model.findOneAndUpdate(
      {
        loan_app_id: loanAppId,
        section_sequence_no: sectionSequenceNo,
        "subsections.sub_section_code": subSectionCode
      },
      {
        $pull: {
          subsections: { sub_section_code: subSectionCode }
        }
      },
      { new: true }
    );

    return doc
  }
}

module.exports = SectionStatusService;
