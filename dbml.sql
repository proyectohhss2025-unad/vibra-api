Table Activities {
    _id ObjectId[pk]
    id String
    emotions String
    title String
    resources Resources[]
    questions Questions[]
    difficulty Int
    isActive Boolean
    schedule Schedule
    createdAt DateTime
}
  
Table Resources {
    type String
    url String
    duration Int
    metadata Metadatas
}
  
Table Metadatas {
    author String
    language String
}
  
Table Questions {
    id String
    questionText String
    type String
    options String[]
    correctAnswer String
    points Int
}
  
Table Schedule {
    date DateTime
    weekNumber Int
    year Int
}
  
Table Configs {
      _id ObjectId[pk]
      name String
      flag Boolean
      allowedUsers String[]
      disallowedUsers String[]
      createdBy String
      createdAt DateTime
      editedAt DateTime
      editedBy String
      isActive Boolean
      description String
      __v Int
}
    
Table Emotions {
    _id ObjectId[pk]
    id String
    name String
    orientationNote String
    description String
    icono String
    percentNote Int
}
    
Table HightSchools {
    _id ObjectId[pk]
    id String
    name String
    address String
    nit String
    email String
    __v Int
}

Table Courses {
    _id ObjectId[pk]
    id String
    name String
    hightSchool String
}
    
Table NotificationChannels {
    _id ObjectId[pk]
    title String
    description String
    level Int
}
    
Table Notifications {
    _id ObjectId[pk]
    ID String
    title String
    message String
    isRead Boolean
    client String
    notificationType String
    notificationChannel String
    priority Int
    serial String
    isActive Boolean
    deleted Boolean
    deletedAt DateTime
    createdAt DateTime
    __v Int
}

Table NotificationTypes {
    _id ObjectId[pk]
    title String
    description String
    level Int
}
  
Table Permissions {
    _id ObjectId[pk]
    serial String
    name String
    description String
    permissionCategory String
    isActive Boolean
    createdAt DateTime
    createdBy String
    __v Int
    deleted Boolean
    deletedAt DateTime
    deletedBy String
}
    
Table PermissionCategories {
    _id ObjectId[pk]
    serial String
    name String
    description String
    isActive Boolean
    createdAt DateTime
    createdBy String
    __v Int
}
    
Table UserPermissions {
    _id ObjectId[pk]
    user String
    permission String
    serial String
    isActive Boolean
    deleted Boolean
    createdAt DateTime
    createdBy String
    deletedAt DateTime
    __v Int
    deletedBy String
}
    
Table Policies {
    _id ObjectId[pk]
    title String
    content String
    version String
    isActive Boolean
    type String
    effectiveDate DateTime
    createdAt DateTime
    updatedAt DateTime
}
    
Table Pretest {
    _id ObjectId[pk]
    testId String
    userId String
    responses PretestResponse[]
    __v Int
}
    
Table PretestResponse {
    questionId String
    answer String
}
    
Table Roles {
    _id ObjectId[pk]
    serial String
    name String
    description String
    isSuperAdmin Boolean
    isActive Boolean
    createdAt DateTime
    createdBy String
    __v Int
    deleted Boolean
    deletedAt DateTime
    editedAt DateTime
    permissionTemplate String
}
    
Table UserResponses {
    _id ObjectId[pk]
    user String
    activity String
    responses UserResponse[]
    score Int
    startTime DateTime
    endTime DateTime
    timeSpent Int
    createdAt DateTime
    updatedAt DateTime
    __v Int
}
    
Table UserResponse {
    _id ObjectId[pk]
    questionId String
    answer String
    isCorrect Boolean
    responseTime Int
}

Table Feedbacks {
  _id ObjectId [pk]
  title String
  description String
  isFeature Boolean
  isSupport Boolean
  serial String
  isActive Boolean
  deleted Boolean
  createdAt DateTime
  createdBy String
  deletedAt DateTime
  __v Int
}

Table Companies {
  _id ObjectId [pk]
  name String
  nit String
  address String
  email String
  phoneNumber Long
  managerData ManagerData
  createdAt DateTime
  deleted Boolean
  deletedAt DateTime
  isActive Boolean
  slogan String
  userAdmin String
  editedAt DateTime
  isMain Boolean
}

Table ManagerData {
  name String
  documentType String
  document String
  email String
  phoneNumber String
}

Table Clients {
  _id ObjectId [pk]
  name string
  nit string
  epsCode string
  address string
  phoneNumber string
  email string
  overdueInvoiceIds ObjectId[]
  creditLimit number
  transactions ObjectId[]
  avatar string
  isParticular boolean
  regime string
  serial string
  isActive boolean
  deleted boolean
  createdAt datetime
  createdBy string
  deletedAt datetime
  __v number
}

Table AuditLogs {
  _id ObjectId [pk]
  user string
  action string
  entity string
  details string
  ip string
  isActive boolean
  deleted boolean
  timestamp datetime
  deletedAt datetime
  createdAt datetime
  __v number
}

Table WeeklySchedules {
  _id ObjectId [pk]
  weekNumber number
  year number
  days ObjectId[]
  participants ObjectId[]
  __v number
}

Table Reports {
  _id ObjectId [pk]
  invoiceId string
  reportType string
  downloadHistory ObjectId[]
  createdAt datetime
  __v number
}


Table FsFiles {
  _id ObjectId [pk]
  length Int
  chunkSize Int
  uploadDate DateTime
  filename String
}

Table UserPolicies {
  _id ObjectId [pk]
  userId ObjectId
  policyId ObjectId
  userPolicyKey String
  version String
  isAccepted Boolean
  ipAddress String
  userAgent String
  acceptedAt DateTime
  createdAt DateTime
  updatedAt DateTime
  __v Int
}

Table Users {
  _id ObjectId [pk]
  name String
  documentType ObjectId
  documentNumber String
  address String
  phoneNumber String
  email String
  username String
  password String
  createdAt DateTime
  createdBy String
  editedAt DateTime
  editedBy String
  deleted Boolean
  deletedAt DateTime
  isActive Boolean
  role ObjectId
  company ObjectId
  gender String
  isLogged Boolean
  avatar String
  birthDate DateTime
  updatedAt DateTime
  __v Int
}