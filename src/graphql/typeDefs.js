import { gql } from "graphql-tag";

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    phone: String
    address: String
    role: UserRole!
    createdAt: String!
    updatedAt: String!
  }

  enum UserRole {
    USER
    ADMIN
    MODERATOR
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    name: String!
    email: String!
    phone: String
    address: String
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Query {
    users: [User]
    user(id: ID!): User
    getUserProfile: User
    products: [Product]
    product(id: ID!): Product
    categories: [Category]
    category(id: ID!): Category
  }

  type Mutation {
    createUser(name: String!, email: String!): User
    register(input: RegisterInput!): AuthPayload
    login(input: LoginInput!): AuthPayload
    socialAuth(email: String!, device: String): AuthPayload
    createCategory(input: CreateCategoryInput!): Category
    createProduct(input: CreateProductInput!): Product
    updateCategory(input: UpdateCategoryInput!): Category
    updateProduct(input: UpdateProductInput!): Product
    deleteCategory(id: ID!): Boolean
    deleteProduct(id: ID!): Boolean
  }

  input CreateCategoryInput {
    name: String!
    slug: String!
    type: CategoryType!
    parentId: String
  }
  
  input CreateProductInput {
    title: String
    description: String
    price: Int
    unit: String
    quantity: Int
    location: String
    images: [String]
    status: ProductStatus
    attributes: [String]
    categoryId: String
    userId: String!
  }

  input UpdateProductInput {
    id: ID!
    title: String
    description: String
    price: Int
    unit: String
    quantity: Int
    location: String
    images: [String]
    status: ProductStatus
    attributes: [String]
    categoryId: String
    userId: String!
  }
  
  input UpdateCategoryInput {
    id: ID!
    name: String
    slug: String
    type: CategoryType
    parentId: String
  }

  type Category {
    id: ID
    name: String
    slug: String
    type: CategoryType
    parentId: String
    parent: Category
    children: [Category]
    products: [Product]
    createdAt: String
    updatedAt: String
  }

  enum CategoryType {
    ANIMAL
    PRODUCT  
  }

  type Product {
    id: ID!
    title: String!
    description: String
    price: Int!
    unit: String!
    quantity: Int!
    location: String!
    images: [String!]!
    attributes: [String!]!
    status: ProductStatus
    categoryId: String
    userId: String
    createdAt: String
    updatedAt: String
  }

  enum ProductStatus {
    ACTIVE 
    SOLD
    PENDING
  }

`;

export default typeDefs;
