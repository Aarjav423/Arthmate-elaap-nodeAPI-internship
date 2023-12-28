class BaseService {
  constructor(model) {
    this.model = model;
    this.findAll = this.findAll.bind(this);
    this.findWithPagination = this.findWithPagination.bind(this);
    this.findById = this.findById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
  }

  async findAll(query = {}) {
    return await this.model.find(query).exec();
  }

  async findOne(query) {
    return await this.model.findOne(query).exec();
  }

  async findWithPagination(query = {}, sort = { _id: -1 }) {
    const { page = 1, size = 10 } = query;

    const totalItems = await this.model.countDocuments();
    const totalPages = Math.ceil(totalItems / size);

    const result = await this.model
      .find(query)
      .sort(sort)
      .skip(page * size)
      .limit(size)
      .all();

    return {
      result,
      next: page + 1 <= totalPages ? page + 1 : null,
      prev: page - 1 >= 1 ? page - 1 : null,
      totalPages,
      size,
      page,
    };
  }

  async findById(id) {
    return await this.model.findById(id).exec();
  }

  async update(query, update) {
    return await this.model.findOneAndUpdate(query, update, { new: true });
  }

  async create(data) {
    return await this.model.create(data);
  }
}
module.exports = BaseService;
