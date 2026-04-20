# Use Case Diagram: Patient Intake Web Application

This diagram represents the actors and their interactions with the system, following the structure and style of the project requirements.

```mermaid
usecaseDiagram
    actor "admin" as admin
    actor "Doctor" as doctor
    actor "patient" as patient

    package "Patient Intake Web Application" {
        usecase "login" as UC1
        usecase "registration" as UC2
        usecase "manage department" as UC3
        usecase "manage doctor" as UC4
        usecase "view booking details" as UC5
        usecase "View patient details" as UC6
        usecase "view payment details" as UC7
        usecase "search treatments" as UC8
        usecase "booking appointment" as UC9
        usecase "payment" as UC10
        usecase "Cancel" as UC11
        usecase "view feedback" as UC12
        usecase "report" as UC13
    }

    %% Admin relationships
    admin --> UC1
    admin --> UC2
    admin --> UC3
    admin --> UC4
    admin --> UC5
    admin --> UC6
    admin --> UC7
    admin --> UC12
    admin --> UC13

    %% Doctor relationships
    doctor --> UC1
    doctor --> UC5
    doctor --> UC6
    doctor --> UC7
    doctor --> UC8
    doctor --> UC12
    doctor --> UC13

    %% Patient relationships
    patient --> UC1
    patient --> UC2
    patient --> UC5
    patient --> UC6
    patient --> UC7
    patient --> UC8
    patient --> UC9
    patient --> UC11

    %% Includes
    UC9 ..> UC10 : <<include>>
```
