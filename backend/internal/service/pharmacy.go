package service

import (
	"context"
	"errors"
	"strings"

	"dental-crm/backend/internal/model"
	"dental-crm/backend/internal/repository"
)

func (s *Service) ListPharmacy(ctx context.Context, query string) ([]model.PharmacyItem, error) {
	items, err := s.repo.ListPharmacy(ctx, strings.TrimSpace(query))
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []model.PharmacyItem{}
	}
	return items, nil
}

func (s *Service) ConsumePharmacy(ctx context.Context, id int64) (model.PharmacyItem, error) {
	if id <= 0 {
		return model.PharmacyItem{}, invalid("некорректная позиция склада")
	}
	item, err := s.repo.ConsumePharmacy(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return model.PharmacyItem{}, invalid("позиция не найдена")
	}
	if errors.Is(err, repository.ErrEmptyStock) {
		return model.PharmacyItem{}, invalid("на складе не осталось")
	}
	return item, err
}
