package service

import (
	"context"
	"errors"
	"strings"

	"dental-crm/backend/internal/model"
	"dental-crm/backend/internal/repository"
)

func (s *Service) ListPatients(ctx context.Context) ([]model.Patient, error) {
	return s.repo.ListPatients(ctx)
}

func (s *Service) UpdatePatientCard(ctx context.Context, id int64, card model.PatientCard) (model.Patient, error) {
	if id <= 0 {
		return model.Patient{}, invalid("некорректный пациент")
	}
	card.Diagnosis = strings.TrimSpace(card.Diagnosis)
	card.Notes = strings.TrimSpace(card.Notes)
	patient, err := s.repo.UpdatePatientCard(ctx, id, card)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return model.Patient{}, invalid("пациент не найден")
		}
		return model.Patient{}, err
	}
	return patient, nil
}
