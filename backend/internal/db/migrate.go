package db

import (
    "fmt"
    "os"

    "github.com/golang-migrate/migrate/v4"
    _ "github.com/lib/pq"
    _ "github.com/golang-migrate/migrate/v4/source/file"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
)

func RunMigrations() error {
    dbHost := os.Getenv("DB_HOST")
    dbPort := os.Getenv("DB_PORT")
    dbUser := os.Getenv("DB_USER")
    dbPassword := os.Getenv("DB_PASSWORD")
    dbName := os.Getenv("DB_NAME")

    dbURL := fmt.Sprintf(
        "postgres://%s:%s@%s:%s/%s?sslmode=disable",
        dbUser, dbPassword, dbHost, dbPort, dbName,
    )

    m, err := migrate.New(
        "file://internal/migrations",
        dbURL,
    )
    if err != nil {
        return err
    }

    // Run migrations up; ignore ErrNoChange
    if err := m.Up(); err != nil && err.Error() != "no change" {
        return err
    }
    return nil
}
