package service

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"dental-crm/backend/internal/repository"
)

type Service struct {
	repo repository.Repository
}

func New(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

type ValidationError struct {
	Message string
}

func (e ValidationError) Error() string {
	return e.Message
}

func invalid(message string) error {
	return ValidationError{Message: message}
}

func notFound(err error, message string) error {
	if errors.Is(err, repository.ErrNotFound) {
		return invalid(message)
	}
	return err
}

func today() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
}

func parseDay(value string) (time.Time, error) {
	day, err := time.Parse("2006-01-02", strings.TrimSpace(value))
	if err != nil {
		return time.Time{}, invalid("дата в формате ГГГГ-ММ-ДД")
	}
	return day, nil
}

func validateTime(value string) error {
	parsed, err := time.Parse("15:04", value)
	if err != nil || parsed.Format("15:04") != value {
		return invalid("время в формате ЧЧ:ММ")
	}
	return nil
}

func validateStatus(status string) error {
	switch status {
	case "Ожидает", "Завершен", "Отменен":
		return nil
	default:
		return invalid("статус: Ожидает, Завершен или Отменен")
	}
}

var ruMonths = [...]string{
	"",
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
}

func monthNumber(name string) (int, error) {
	for i := 1; i < len(ruMonths); i++ {
		if ruMonths[i] == name {
			return i, nil
		}
	}
	n, err := strconv.Atoi(name)
	if err != nil || n < 1 || n > 12 {
		return 0, invalid("некорректный месяц")
	}
	return n, nil
}

func formatMoney(rub int64) string {
	sign := ""
	if rub < 0 {
		sign = "-"
		rub = -rub
	}
	digits := strconv.FormatInt(rub, 10)
	var parts []string
	for len(digits) > 3 {
		parts = append([]string{digits[len(digits)-3:]}, parts...)
		digits = digits[:len(digits)-3]
	}
	parts = append([]string{digits}, parts...)
	return fmt.Sprintf("%s%s ₽", sign, strings.Join(parts, " "))
}
