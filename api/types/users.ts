// User management types

export interface User {
  id: number
  username: string
  email: string
  is_staff?: boolean
  is_superuser?: boolean
  is_active?: boolean
  date_joined?: string
  last_login?: string
  first_name?: string
  last_name?: string
}

export interface UserCreateData {
  username: string
  email: string
  password: string
  confirm_password?: string
  is_staff?: boolean
  is_superuser?: boolean
  first_name?: string
  last_name?: string
}

export interface UserUpdateData {
  username?: string
  email?: string
  password?: string
  is_staff?: boolean
  is_superuser?: boolean
  is_active?: boolean
  first_name?: string
  last_name?: string
}

export interface UserListParams {
  limit?: number
  offset?: number
  search?: string
  ordering?: string
  is_staff?: boolean
  is_active?: boolean
}

