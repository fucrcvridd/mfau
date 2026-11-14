package model

import "time"

type Patient struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	Birth     string `json:"birth"`
	Diagnosis string `json:"diagnosis"`
	Notes     string `json:"notes"`
}

type PatientInput struct {
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	Birth     string `json:"birth"`
	Diagnosis string `json:"diagnosis"`
	Notes     string `json:"notes"`
}

type PatientCard struct {
	Diagnosis string `json:"diagnosis"`
	Notes     string `json:"notes"`
}

type Room struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type Staff struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Role   string `json:"role"`
	RoomID int64  `json:"roomId"`
	Room   string `json:"room"`
}

type ServiceItem struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	PriceRub int64  `json:"priceRub"`
}

type Appointment struct {
	ID      int64  `json:"id"`
	Patient string `json:"patient"`
	Doctor  string `json:"doctor"`
	Time    string `json:"time"`
	Room    string `json:"room"`
	Service string `json:"service"`
	Status  string `json:"status"`
	Date    string `json:"date"`
}

type CreateAppointmentInput struct {
	Patient string `json:"patient"`
	Phone   string `json:"phone"`
	Doctor  string `json:"doctor"`
	Time    string `json:"time"`
	Room    string `json:"room"`
	Service string `json:"service"`
}

type UpdateAppointmentInput struct {
	Room   *string `json:"room"`
	Status *string `json:"status"`
}

type AppointmentWrite struct {
	PatientID int64
	StaffID   int64
	RoomID    int64
	ServiceID int64
	VisitDate time.Time
	VisitTime string
	Status    string
	CostRub   int64
}

type Lead struct {
	ID      int64  `json:"id"`
	Patient string `json:"patient"`
	Phone   string `json:"phone"`
	Service string `json:"service"`
	Date    string `json:"date"`
}

type LeadInput struct {
	Patient string `json:"patient"`
	Phone   string `json:"phone"`
	Service string `json:"service"`
	Date    string `json:"date"`
}

type PharmacyItem struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Stock int    `json:"stock"`
	Unit  string `json:"unit"`
}

type ArchiveRow struct {
	ID        int64
	VisitDate time.Time
	Patient   string
	Doctor    string
	Service   string
	Status    string
	CostRub   int64
}

type ArchiveRecord struct {
	ID      int64  `json:"id"`
	Year    string `json:"year"`
	Month   string `json:"month"`
	Date    string `json:"date"`
	Patient string `json:"patient"`
	Doctor  string `json:"doctor"`
	Service string `json:"service"`
	Cost    string `json:"cost"`
	Status  string `json:"status"`
}

type DoctorLoadRaw struct {
	Name         string
	Room         string
	Appointments int
}

type DoctorLoad struct {
	Name    string `json:"name"`
	Room    string `json:"room"`
	Percent int    `json:"percent"`
}

type ServiceStat struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type Analytics struct {
	Period           string        `json:"period"`
	DentalRevenue    string        `json:"dentalRevenue"`
	PharmacyRevenue  string        `json:"pharmacyRevenue"`
	TotalRevenue     string        `json:"totalRevenue"`
	DentalDelta      string        `json:"dentalDelta"`
	PharmacyDelta    string        `json:"pharmacyDelta"`
	DoctorLoad       []DoctorLoad  `json:"doctorLoad"`
	TopServices      []ServiceStat `json:"topServices"`
}

type Report struct {
	Message      string `json:"message"`
	Patients     int    `json:"patients"`
	WaitingToday int    `json:"waitingToday"`
	OpenLeads    int    `json:"openLeads"`
}
