const aggregatePaginate = function (schema) {
  /**
   * @typedef {Object} AggregationResult
   * @property {Document[]} results - Results found
   * @property {number} page - Current page
   * @property {number} limit - Maximum number of results per page
   * @property {number} totalPages - Total number of pages
   * @property {number} totalResults - Total number of documents
   */
  /**
   * Query for documents with pagination
   * @param {Array} [aggregatePipeline] - Aggregation Pipeline
   * @param {Object} [aggregatePipeline.item] - Aggregation stages
   * @param {Object} [options] - Pagination options
   * @param {string} [options.populate] - Populate data fields. Hierarchy of fields should be separated by (.). Multiple populating criteria should be separated by commas (,)
   * @param {number} [options.limit] - Maximum number of results per page (default = 10)
   * @param {number} [options.page] - Current page (default = 1)
   * @returns {Promise<QueryResult>}
   */
  // Add a static method to the schema
  schema.statics.aggregatePaginate = async function (
    aggregatePipeline,
    options,
  ) {
    const Model = this;

    let sort = {};
    if (options.sortBy) {
      let sortingType = 1;
      options.sortBy.split(',').forEach((sortOption) => {
        const [key, order] = sortOption.split(':');
        if(order=='desc'){
          sortingType=-1
         }
        sort={
          ...sort,
          [key]: sortingType
        }
      });
    } else {
      sort = {
        createdAt:1
      }
    }

    // Set default options if not provided
    const limit =
      options.limit && parseInt(options.limit, 10) > 0
        ? parseInt(options.limit, 10)
        : 10;
    const page =
      options.page && parseInt(options.page, 10) > 0
        ? parseInt(options.page, 10)
        : 1;
    const skip = (page - 1) * limit;

    // Execute the aggregate query with pagination
    const countPromise = Model.aggregate(aggregatePipeline).count('total');

    aggregatePipeline.push({
      $sort: sort
    });

    let docsPromise = Model.aggregate(aggregatePipeline)
      .skip(skip)
      .limit(limit);

    docsPromise = docsPromise.exec();

    return Promise.all([countPromise, docsPromise]).then((values) => {
      const [totalResults, results] = values;
      const totalPages = Math.ceil(totalResults[0]?.total / limit);
      const result = {
        results,
        page,
        limit,
        totalPages: totalPages?totalPages:0,
        totalResults: totalResults[0]?.total ? totalResults[0]?.total: 0,
      };
      return Promise.resolve(result);
    }).catch((e)=>{
      const response= {
        results: [],
        page:null,
        limit:null,
        totalPages:null,
        totalResults: null,
      };
      return Promise.resolve(response)
    });
  };
};

module.exports = aggregatePaginate;
