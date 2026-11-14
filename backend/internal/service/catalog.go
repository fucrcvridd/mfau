package service

import (
	"context"

	"dental-crm/backend/internal/model"
)

func (s *Service) ListStaff(ctx context.Context) ([]model.Staff, error) {
	return s.repo.ListStaff(ctx)
}

func (s *Service) ListRooms(ctx context.Context) ([]model.Room, error) {
	return s.repo.ListRooms(ctx)
}

func (s *Service) ListServices(ctx context.Context) ([]model.ServiceItem, error) {
	return s.repo.ListServices(ctx)
}
