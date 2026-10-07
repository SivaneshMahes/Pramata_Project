output "mongodb_uri" {
  description = "Connection string to store in Secrets Manager as MONGODB_URI."
  sensitive   = true
  value = format(
    "%s/%s?retryWrites=true&w=majority",
    replace(
      mongodbatlas_advanced_cluster.this.connection_strings[0].standard_srv,
      "mongodb+srv://",
      "mongodb+srv://${mongodbatlas_database_user.app.username}:${random_password.app_user.result}@",
    ),
    var.database_name,
  )
}

output "cluster_id" {
  value = mongodbatlas_advanced_cluster.this.cluster_id
}
