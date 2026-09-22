import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { getTodayDate as utilGetTodayDate, handleSmartDateInput, normalizeAIExtractedDate } from '../../utils/dateFormatter'
import { pdfToImages } from '../../utils/pdfToImages'
import { enforceMobileNumberFormat } from '../../utils/contactValidation'
import DocumentScannerPreview from '../../components/DocumentScannerPreview'
import { getInsuranceCompanies, initInsuranceCompanyCache, subscribeInsuranceCompanies } from '../../utils/insuranceCompanyCache'
import { getProductTypes, initProductTypeCache, subscribeProductTypes } from '../../utils/productTypeCache'
import { useAiLimit, invalidateAiLimitCache } from '../../utils/useAiLimit'
import AiLimitModal from '../../components/AiLimitModal'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

// Bootstrap the midnight cache-refresh scheduler once when this module loads
initInsuranceCompanyCache(API_URL)
initProductTypeCache(API_URL)

const resolveStoredDocumentPreview = (documentPath) => {
  if (!documentPath) return null
  if (documentPath.startsWith('data:')) return documentPath
  if (documentPath.startsWith('http://') || documentPath.startsWith('https://')) return documentPath
  return `${API_URL}${documentPath}`
}

const normalizeInsuranceCompany = (companyName, companies) => {
  if (!companyName || !companies?.length) return ''
  
  const cleanStr = (str) => {
    return (str || '')
      .trim()
      .replace(/[-\/]/g, ' ') // replace hyphens and slashes with space
      .replace(/[^a-zA-Z0-9\s]/g, '') // remove special characters
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .toLowerCase();
  }

  const cleaned = cleanStr(companyName)

  // 1. Exact substring match
  const exactMatch = companies.find(c => {
    const cCleaned = cleanStr(c.name)
    return cleaned.includes(cCleaned) || cCleaned.includes(cleaned)
  })
  if (exactMatch) return exactMatch

  // 2. Word-overlap scoring
  const ocrWords = new Set(cleaned.split(/\s+/).filter(w => w.length > 2))
  const stopwords = new Set(['general', 'insurance', 'company', 'limited', 'ltd', 'services', 'co'])
  const filteredOcrWords = new Set([...ocrWords].filter(w => !stopwords.has(w)))

  let bestMatch = null
  let bestScore = 0
  
  for (const c of companies) {
    const cCleaned = cleanStr(c.name)
    const cWords = cCleaned.split(/\s+/).filter(w => w.length > 2)
    const filteredCWords = cWords.filter(w => !stopwords.has(w))
    
    if (filteredCWords.length === 0) continue

    const overlap = filteredCWords.filter(w => filteredOcrWords.has(w)).length
    const score = overlap / filteredCWords.length
    if (overlap >= 1 && score > bestScore) {
      bestScore = score
      bestMatch = c
    }
  }
  return bestMatch || null
}

// Exact (case-insensitive) name match — used to link legacy records that only have a stored name
const findCompanyByExactName = (name, companies) => {
  if (!name || !companies?.length) return null
  const target = name.trim().toLowerCase()
  return companies.find(c => c.name.trim().toLowerCase() === target) || null
}

const PRODUCT_TYPE_KEYWORD_MAP = [
  { value: 'Two Wheeler', keywords: ['two wheeler', 'two-wheeler', '2 wheeler', '2-wheeler', 'motor cycle', 'motorcycle', 'motor bike', 'bike', 'scooter'] },
  { value: 'Taxi', keywords: ['taxi', 'cab'] },
  { value: 'GCV-3W', keywords: ['gcv-3w', 'gcv 3w', 'goods carrying vehicle 3 wheeler', 'goods 3 wheeler'] },
  { value: 'PCV-3W', keywords: ['pcv-3w', 'pcv 3w', 'passenger carrying vehicle 3 wheeler', 'passenger 3 wheeler', 'auto rickshaw', 'three wheeler'] },
  { value: 'GCV', keywords: ['gcv', 'goods carrying vehicle', 'goods carrying', 'commercial vehicle', 'truck', 'lorry'] },
  { value: 'PCV', keywords: ['pcv', 'passenger carrying vehicle', 'passenger carrying', 'bus'] },
  { value: 'Pvt. Car', keywords: ['private car', 'pvt car', 'pvt. car', 'personal car', 'own damage car', 'car policy'] },
  { value: 'Mis-D', keywords: ['miscellaneous d', 'mis-d', 'mis d'] },
  { value: 'Health', keywords: ['health', 'mediclaim', 'medical insurance'] },
  { value: 'Life', keywords: ['life insurance', 'term insurance', 'term plan'] },
  { value: 'Fire', keywords: ['fire insurance', 'fire policy', 'standard fire', 'fire and special perils'] },
  { value: 'Burglary', keywords: ['burglary'] },
  { value: 'WC', keywords: ['workmen', 'workmens compensation', "workmen's compensation", 'wc policy'] },
  { value: 'CPM', keywords: ['contractors plant', 'cpm'] },
  { value: 'Travel', keywords: ['travel insurance', 'travel policy'] },
  { value: 'Marine', keywords: ['marine'] },
  { value: 'GPA', keywords: ['group personal accident', 'gpa', 'personal accident'] },
  { value: 'GMC', keywords: ['group mediclaim', 'gmc'] },
  { value: 'CAR', keywords: ['car'] },
  { value: 'IAR', keywords: ['iar', 'industrial all risks', 'industrial all risk'] },
  { value: 'EAR', keywords: ['ear', 'erection all risks', 'erection all risk'] },
  { value: 'SCHOOL BUS', keywords: ['school bus'] },
  { value: 'LIABILITY', keywords: ['liability'] },
  { value: 'SECURITY BOND', keywords: ['security bond', 'surety bond'] }
]

const normalizeProductType = (productType, availableProductTypes = []) => {
  if (!productType) return ''
  const cleaned = productType.trim().toLowerCase()
  const directMatch = availableProductTypes.find(p => {
    const name = typeof p === 'string' ? p : p.name
    return name && name.toLowerCase() === cleaned
  })
  if (directMatch) return typeof directMatch === 'string' ? directMatch : directMatch.name
  for (const entry of PRODUCT_TYPE_KEYWORD_MAP) {
    if (entry.keywords.some(k => cleaned.includes(k))) return entry.value
  }
  return ''
}

const AddInsuranceModal = ({ isOpen, onClose, onSubmit, initialData = null, isEditMode = false, prefilledVehicleNumber = '', prefilledOwnerName = '', initialExtractionFile = null }) => {
  const isManualMode = isEditMode || !initialExtractionFile
  const isOcrUpdate = useRef(false)
  const [usedAiExtraction, setUsedAiExtraction] = useState(false)
  const { checkLimit, limitModalOpen, closeLimitModal, used: aiUsed, limit: aiLimit } = useAiLimit()
  const processedInitialFile = useRef(false)
  const userEditedValidTo = useRef(false)
  const getTodayDate = () => utilGetTodayDate()
  const [formData, setFormData] = useState({
    vehicleNumber: prefilledVehicleNumber,
    policyNumber: '',
    policyHolderName: prefilledOwnerName,
    validFrom: '',
    validTo: '',
    tpValidFrom: '',
    tpValidTo: '',
    issueDate: utilGetTodayDate(),
    odPremium: '',
    tpPremium: '',
    netPremium: '',
    premium: '',
    insuranceDocument: '',
    endorsementDocument: '',
    insuranceCompany: '',
    insuranceCompanyId: '',
    insuranceClass: '',
    product: '',
    productTypeId: '',
    vehicleClass: '',
    remarks: '',
    reference: '',
    referenceId: '',
    imd: '',
    imdId: '',
    claimRaised: false,
    claimDate: '',
    claimRemarks: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanningFile, setScanningFile] = useState(null)
  const [isExtractingInsurance, setIsExtractingInsurance] = useState(false)
  const [uploadedInsuranceDocument, setUploadedInsuranceDocument] = useState(null)
  const [uploadedInsuranceFile, setUploadedInsuranceFile] = useState(null)
  const [endorsements, setEndorsements] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [references, setReferences] = useState([])
  const [referenceDropdownOpen, setReferenceDropdownOpen] = useState(false)
  const [referenceSearch, setReferenceSearch] = useState('')
  const [showAddReference, setShowAddReference] = useState(false)
  const [newReferenceName, setNewReferenceName] = useState('')
  const [newReferenceMobile, setNewReferenceMobile] = useState('')
  const [newReferenceEmail, setNewReferenceEmail] = useState('')
  const [newReferenceReference, setNewReferenceReference] = useState('')
  const [newReferenceAddress, setNewReferenceAddress] = useState('')
  const [newReferenceOtherInfo, setNewReferenceOtherInfo] = useState('')

  const [imds, setImds] = useState([])
  const [imdDropdownOpen, setImdDropdownOpen] = useState(false)
  const [imdSearch, setImdSearch] = useState('')
  const [showAddImd, setShowAddImd] = useState(false)
  const [newImdName, setNewImdName] = useState('')
  const [newImdMobile, setNewImdMobile] = useState('')
  const [newImdEmail, setNewImdEmail] = useState('')
  const [newImdAgentCode, setNewImdAgentCode] = useState('')
  const [newImdReference, setNewImdReference] = useState('')
  const [newImdAddress, setNewImdAddress] = useState('')
  const [newImdOtherInfo, setNewImdOtherInfo] = useState('')
  const [insuranceCompanies, setInsuranceCompanies] = useState([])
  // Mirror of insuranceCompanies in a ref so applyOcrResult closure always reads the latest list
  const insuranceCompaniesRef = useRef([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const pendingOcrCompanyName = useRef(null) // stores raw OCR company name if companies weren't loaded yet

  const [productTypes, setProductTypes] = useState([])
  const productTypesRef = useRef([])

  const createNewEndorsement = (file = null, existingUrl = '', name = '') => {
    const isPdf = file 
      ? (file.type === 'application/pdf')
      : (existingUrl.startsWith('data:application/pdf') || existingUrl.toLowerCase().includes('.pdf') || existingUrl.toLowerCase().endsWith('.pdf'))
    return {
      file,
      existingUrl,
      name: name || (file ? file.name : (existingUrl ? existingUrl.split('/').pop() || 'endorsement-document' : '')),
      type: isPdf ? 'pdf' : 'image',
      previewUrl: file ? URL.createObjectURL(file) : (existingUrl ? resolveStoredDocumentPreview(existingUrl) : ''),
      revokeOnCleanup: !!file
    }
  }

  useEffect(() => {
    return () => {
      if (uploadedInsuranceDocument?.revokeOnCleanup && uploadedInsuranceDocument.previewUrl) {
        URL.revokeObjectURL(uploadedInsuranceDocument.previewUrl)
      }
    }
  }, [uploadedInsuranceDocument])

  useEffect(() => {
    return () => {
      setEndorsements(prev => {
        prev.forEach(item => {
          if (item.revokeOnCleanup && item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl)
          }
        })
        return []
      })
    }
  }, [])

  useEffect(() => {
    if (initialData && isOpen) {
      const vehicleNum = initialData.vehicleNumber || ''
      setFormData({
        vehicleNumber: vehicleNum,
        policyNumber: initialData.policyNumber || '',
        policyHolderName: initialData.policyHolderName || '',
        validFrom: initialData.validFrom || '',
        validTo: initialData.validTo || '',
        tpValidFrom: initialData.tpValidFrom || '',
        tpValidTo: initialData.tpValidTo || '',
        issueDate: initialData.issueDate || utilGetTodayDate(),
        odPremium: initialData.odPremium != null ? String(initialData.odPremium) : '',
        tpPremium: initialData.tpPremium != null ? String(initialData.tpPremium) : '',
        netPremium: initialData.netPremium != null ? String(initialData.netPremium) : '',
        premium: initialData.premium != null ? String(initialData.premium) : '',
        insuranceDocument: initialData.insuranceDocument || '',
        endorsementDocument: initialData.endorsementDocument || '',
        insuranceCompany: initialData.insuranceCompany || '',
        insuranceCompanyId: initialData.insuranceCompanyId || '',
        insuranceClass: initialData.insuranceClass || '',
        product: initialData.product || '',
        productTypeId: initialData.productTypeId || '',
        vehicleClass: initialData.vehicleClass || '',
        remarks: initialData.remarks || '',
        reference: initialData.reference || '',
        referenceId: initialData.referenceId || '',
        imd: initialData.imd || '',
        imdId: initialData.imdId || '',
        claimRaised: initialData.claimRaised || false,
        claimDate: initialData.claimDate || '',
        claimRemarks: initialData.claimRemarks || ''
      })
      setUploadedInsuranceDocument(
        initialData.insuranceDocument
          ? {
              name: 'insurance-document',
              type: initialData.insuranceDocument.startsWith('data:application/pdf') || initialData.insuranceDocument.toLowerCase().includes('.pdf') ? 'pdf' : 'image',
              previewUrl: resolveStoredDocumentPreview(initialData.insuranceDocument),
              revokeOnCleanup: false
            }
          : null
      )
      setUploadedInsuranceFile(null)
      let initialEndorsements = []
      if (initialData.endorsementDocuments && initialData.endorsementDocuments.length > 0) {
        initialEndorsements = initialData.endorsementDocuments.map(url => createNewEndorsement(null, url))
      } else if (initialData.endorsementDocument) {
        initialEndorsements = [createNewEndorsement(null, initialData.endorsementDocument)]
      }
      setEndorsements(initialEndorsements)
      userEditedValidTo.current = true
    } else if (!isOpen) {
      setFormData({
        vehicleNumber: prefilledVehicleNumber,
        policyNumber: '',
        policyHolderName: prefilledOwnerName,
        validFrom: '',
        validTo: '',
        tpValidFrom: '',
        tpValidTo: '',
        issueDate: utilGetTodayDate(),
        odPremium: '',
        tpPremium: '',
        netPremium: '',
        premium: '',
        insuranceDocument: '',
        endorsementDocument: '',
        insuranceCompany: '',
        insuranceCompanyId: '',
        insuranceClass: '',
        product: '',
        vehicleClass: '',
        remarks: '',
        reference: '',
        referenceId: '',
        imd: '',
        imdId: '',
        claimRaised: false,
        claimDate: '',
        claimRemarks: ''
      })
      setScanningFile(null)
      setIsExtractingInsurance(false)
      setUploadedInsuranceDocument(prev => {
        if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
        return null
      })
      setUploadedInsuranceFile(null)
      setEndorsements(prev => {
        prev.forEach(item => {
          if (item.revokeOnCleanup && item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl)
          }
        })
        return []
      })
      processedInitialFile.current = false
      userEditedValidTo.current = false
      setUsedAiExtraction(false)
    }
  }, [initialData, isOpen, prefilledVehicleNumber, prefilledOwnerName])

  useEffect(() => {
    if (isOpen) {
      const fetchReferences = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/references`, { withCredentials: true })
          if (res.data.success) setReferences(res.data.data)
        } catch { }
      }
      const fetchImds = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/imd`, { withCredentials: true })
          if (res.data.success) setImds(res.data.data)
        } catch { }
      }
      fetchReferences()
      fetchImds()
    }
  }, [isOpen])

  const handleReferenceSelect = (ref) => {
    setFormData(prev => ({ ...prev, reference: ref.name, referenceId: ref._id }))
    setReferenceDropdownOpen(false)
    setReferenceSearch('')
  }

  const handleAddReference = async () => {
    const name = newReferenceName.trim()
    const mobile = newReferenceMobile.trim()
    const email = newReferenceEmail.trim()
    const reference = newReferenceReference.trim()
    const address = newReferenceAddress.trim()
    const otherInfo = newReferenceOtherInfo.trim()
    
    if (!name && !mobile && !email && !reference && !address && !otherInfo) {
      toast.error('Please fill at least one field')
      return
    }
    try {
      const res = await axios.post(`${API_URL}/api/references`, {
        name,
        mobile,
        email,
        reference,
        address,
        otherInfo
      }, { withCredentials: true })
      if (res.data.success) {
        setReferences(prev => {
          const exists = prev.find(r => r._id === res.data.data._id)
          return exists ? prev.map(r => r._id === res.data.data._id ? res.data.data : r) : [...prev, res.data.data].sort((a, b) => a.name.localeCompare(b.name))
        })
        setFormData(prev => ({ ...prev, reference: res.data.data.name, referenceId: res.data.data._id }))
        setNewReferenceName('')
        setNewReferenceMobile('')
        setNewReferenceEmail('')
        setNewReferenceReference('')
        setNewReferenceAddress('')
        setNewReferenceOtherInfo('')
        setShowAddReference(false)
        setReferenceDropdownOpen(false)
      }
    } catch { }
  }

  const handleImdSelect = (imd) => {
    setFormData(prev => ({ ...prev, imd: imd.name, imdId: imd._id }))
    setImdDropdownOpen(false)
    setImdSearch('')
  }

  const handleAddImd = async () => {
    const name = newImdName.trim()
    const mobile = newImdMobile.trim()
    const email = newImdEmail.trim()
    const agentCode = newImdAgentCode.trim()
    const reference = newImdReference.trim()
    const address = newImdAddress.trim()
    const otherInfo = newImdOtherInfo.trim()

    if (!name && !mobile && !email && !agentCode && !reference && !address && !otherInfo) {
      toast.error('Please fill at least one field')
      return
    }
    try {
      const res = await axios.post(`${API_URL}/api/imd`, {
        name, mobile, email, agentCode, reference, address, otherInfo
      }, { withCredentials: true })
      if (res.data.success) {
        setImds(prev => {
          const exists = prev.find(r => r._id === res.data.data._id)
          return exists ? prev.map(r => r._id === res.data.data._id ? res.data.data : r) : [...prev, res.data.data].sort((a, b) => a.name.localeCompare(b.name))
        })
        setFormData(prev => ({ ...prev, imd: res.data.data.name, imdId: res.data.data._id }))
        setNewImdName('')
        setNewImdMobile('')
        setNewImdEmail('')
        setNewImdAgentCode('')
        setNewImdReference('')
        setNewImdAddress('')
        setNewImdOtherInfo('')
        setShowAddImd(false)
        setImdDropdownOpen(false)
      }
    } catch { }
  }

  const filteredReferences = references.filter(r =>
    !referenceSearch || r.name.toLowerCase().includes(referenceSearch.toLowerCase())
  )

  const filteredImds = imds.filter(r =>
    !imdSearch || r.name.toLowerCase().includes(imdSearch.toLowerCase())
  )

  useEffect(() => {
    if (isOpen && initialExtractionFile && !processedInitialFile.current) {
      processedInitialFile.current = true
      if (initialExtractionFile.type === 'application/pdf') {
        setUploadedInsuranceFile(initialExtractionFile)
        checkLimit().then(canUse => { if (canUse) processExtraction(initialExtractionFile) })
      } else if (initialExtractionFile.type.startsWith('image/')) {
        checkLimit().then(canUse => {
          if (canUse) {
            setUploadedInsuranceFile(initialExtractionFile)
            setScanningFile(initialExtractionFile)
          }
        })
      }
    }
  }, [isOpen, initialExtractionFile])

  useEffect(() => {
    if (isOpen && !initialData && (prefilledVehicleNumber || prefilledOwnerName)) {
      setFormData(prev => ({ ...prev, vehicleNumber: prefilledVehicleNumber, policyHolderName: prefilledOwnerName }))
    }
  }, [isOpen, prefilledVehicleNumber, prefilledOwnerName, initialData])

  useEffect(() => {
    if (isOcrUpdate.current || userEditedValidTo.current || !formData.validFrom) return
    const parts = formData.validFrom.trim().split(/[/-]/)
    if (parts.length !== 3) return
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    if ([day, month, year].some(Number.isNaN) || year <= 1900) return
    const validFromDate = new Date(year, month, day)
    if (Number.isNaN(validFromDate.getTime())) return
    if (validFromDate.getDate() !== day || validFromDate.getMonth() !== month || validFromDate.getFullYear() !== year) return
    const validToDate = new Date(validFromDate)
    validToDate.setFullYear(validToDate.getFullYear() + 1)
    validToDate.setDate(validToDate.getDate() - 1)
    const newDay = String(validToDate.getDate()).padStart(2, '0')
    const newMonth = String(validToDate.getMonth() + 1).padStart(2, '0')
    const newYear = validToDate.getFullYear()
    const formattedValidTo = `${newDay}-${newMonth}-${newYear}`
    if (formData.validTo !== formattedValidTo) {
      setFormData(prev => ({ ...prev, validTo: formattedValidTo }))
    }
  }, [formData.validFrom, formData.validTo])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    setLoadingCompanies(true)

    const updateCompanies = (loaded) => {
      setInsuranceCompanies(loaded)
      insuranceCompaniesRef.current = loaded
      if (pendingOcrCompanyName.current) {
        const matched = normalizeInsuranceCompany(pendingOcrCompanyName.current, loaded)
        if (matched) {
          setFormData(prev => ({ ...prev, insuranceCompany: matched.name, insuranceCompanyId: matched._id }))
        }
        pendingOcrCompanyName.current = null
      }
      setFormData(prev => {
        if (prev.insuranceCompanyId || !prev.insuranceCompany) return prev
        const legacyMatch = findCompanyByExactName(prev.insuranceCompany, loaded)
        return legacyMatch ? { ...prev, insuranceCompanyId: legacyMatch._id } : prev
      })
    }

    getInsuranceCompanies(API_URL, true)
      .then(updateCompanies)
      .catch(() => {})
      .finally(() => setLoadingCompanies(false))

    const unsubscribe = subscribeInsuranceCompanies(updateCompanies)
    return () => unsubscribe()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const updateProductTypes = (loaded) => {
      setProductTypes(loaded)
      productTypesRef.current = loaded
    }

    getProductTypes(API_URL, true)
      .then(updateProductTypes)
      .catch(() => {})

    const unsubscribe = subscribeProductTypes(updateProductTypes)
    return () => unsubscribe()
  }, [isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'vehicleNumber') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }))
      return
    }
    if (name === 'policyNumber') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }))
      return
    }
    if (name === 'product') {
      const match = productTypesRef.current.find(p => (typeof p === 'string' ? p : p.name) === value)
      setFormData(prev => ({
        ...prev,
        product: value,
        productTypeId: (typeof match === 'object' && match?._id) ? match._id : ''
      }))
      return
    }
    if (name === 'issueDate' || name === 'validFrom' || name === 'validTo' || name === 'tpValidFrom' || name === 'tpValidTo') {
      if (name === 'validTo') userEditedValidTo.current = true
      if (value) {
        const [year, month, day] = value.split('-')
        const formatted = `${day}-${month}-${year}`
        setFormData(prev => ({ ...prev, [name]: formatted }))
      } else {
        setFormData(prev => ({ ...prev, [name]: '' }))
      }
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleClaimToggle = () => {
    setFormData(prev => ({ ...prev, claimRaised: !prev.claimRaised }))
  }

  const applyOcrResult = (resultData) => {
    setFormData(prev => {
      const updated = { ...prev }
      Object.keys(resultData).forEach((key) => {
        const value = resultData[key]
        if (!value || !Object.prototype.hasOwnProperty.call(updated, key)) return
        if (key === 'validFrom' || key === 'validTo' || key === 'tpValidFrom' || key === 'tpValidTo' || key === 'issueDate') {
          const normalizedStr = normalizeAIExtractedDate(value)
          const formatted = handleSmartDateInput(normalizedStr, '')
          if (formatted) updated[key] = formatted
          return
        }
        if (key === 'vehicleNumber') {
          updated[key] = value.toUpperCase().replace(/\s+/g, '')
          return
        }
        if (key === 'policyNumber') {
          updated[key] = value.toUpperCase()
          return
        }
        if (key === 'insuranceCompany') {
          // Use the ref so we always read the latest list, even if the closure
          // was created before the companies state had loaded
          const currentCompanies = insuranceCompaniesRef.current
          const matched = normalizeInsuranceCompany(value, currentCompanies)
          if (matched) {
            updated[key] = matched.name
            updated.insuranceCompanyId = matched._id
          } else {
            // Companies list may not be loaded yet — store raw value and retry after load
            pendingOcrCompanyName.current = value
            updated[key] = '' // don't put garbage in the dropdown
            updated.insuranceCompanyId = ''
          }
          return
        }
        if (key === 'product') {
          const normalized = normalizeProductType(value, productTypesRef.current)
          if (normalized) updated[key] = normalized
          else updated[key] = value
          return
        }
        if (key === 'premium' || key === 'odPremium' || key === 'tpPremium' || key === 'netPremium') {
          updated[key] = String(value).replace(/[^0-9.]/g, '')
          return
        }
        updated[key] = value
      })
      return updated
    })
  }

  const processExtraction = async (fileToProcess) => {
    // Pre-flight limit check (fast, cached)
    const canUse = await checkLimit()
    if (!canUse) return

    setIsExtractingInsurance(true)
    const updateToast = toast.info('Analyzing insurance document, please wait...', { autoClose: false, isLoading: true })

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const response = await axios.post(`${API_URL}/api/ocr/insurance`, { imageBase64: reader.result }, { withCredentials: true })
          if (response.data.success && response.data.data) {
            const resultData = response.data.data
            isOcrUpdate.current = true
            applyOcrResult(resultData)
            setUsedAiExtraction(true)
            setTimeout(() => { isOcrUpdate.current = false }, 200)
            setUploadedInsuranceDocument(prev => {
              if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
              return {
                name: fileToProcess.name || 'insurance-document',
                type: fileToProcess.type === 'application/pdf' ? 'pdf' : 'image',
                previewUrl: URL.createObjectURL(fileToProcess),
                revokeOnCleanup: true
              }
            })
            invalidateAiLimitCache()
            toast.dismiss(updateToast)
            toast.success('Insurance details extracted successfully!', { position: 'top-right', autoClose: 3000 })
          } else {
            toast.dismiss(updateToast)
            toast.error('Failed to extract data correctly.', { position: 'top-right', autoClose: 3000 })
          }
        } catch (error) {
          // 403 = AI limit reached (race condition between check and actual request)
          if (error.response?.status === 403) {
            toast.dismiss(updateToast)
            const { used: u = 0, limit: l = 0 } = error.response.data || {}
            invalidateAiLimitCache()
            // Re-check to populate the modal with fresh values then show it
            await checkLimit()
            return
          }
          if (error.response?.status === 422 && error.response?.data?.isScannedPdf && fileToProcess) {
            const fallbackToast = toast.info('Scanned PDF detected. Converting to images for visual analysis...', { autoClose: false, isLoading: true })
            try {
              const pageImages = await pdfToImages(fileToProcess, 2, 1.2, 0.7)
              if (pageImages && pageImages.length > 0) {
                toast.update(fallbackToast, { render: 'Analyzing scanned document with Vision AI...', isLoading: true })
                const visionResponse = await axios.post(
                  `${API_URL}/api/ocr/insurance`,
                  { imageBase64: pageImages[0], backImageBase64: pageImages[1] || null },
                  { withCredentials: true }
                )
                if (visionResponse.data.success && visionResponse.data.data) {
                  const resultData = visionResponse.data.data
                  isOcrUpdate.current = true
                  applyOcrResult(resultData)
                  setUsedAiExtraction(true)
                  setTimeout(() => { isOcrUpdate.current = false }, 500)
                  setUploadedInsuranceDocument(prev => {
                    if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
                    return {
                      name: fileToProcess.name || 'insurance-document',
                      type: 'pdf',
                      previewUrl: URL.createObjectURL(fileToProcess),
                      revokeOnCleanup: true
                    }
                  })
                  invalidateAiLimitCache()
                  toast.dismiss(fallbackToast)
                  toast.success('Insurance details extracted successfully via Vision!', { position: 'top-right', autoClose: 3000 })
                  return
                }
              }
            } catch (visionErr) {
              if (visionErr.response?.status === 403) {
                toast.dismiss(fallbackToast)
                invalidateAiLimitCache()
                await checkLimit()
                return
              }
              console.error('Vision fallback failed:', visionErr)
            }
            toast.dismiss(fallbackToast)
            toast.error('Could not analyze the scanned PDF. Please fill details manually.', { position: 'top-right', autoClose: 4000 })
          } else {
            console.error(error)
            toast.dismiss(updateToast)
            toast.error('Server error during OCR processing.', { position: 'top-right', autoClose: 3000 })
          }
        } finally {
          setIsExtractingInsurance(false)
        }
      }
      reader.readAsDataURL(fileToProcess)
    } catch (error) {
      console.error(error)
      toast.dismiss(updateToast)
      toast.error('Error reading the file.', { position: 'top-right', autoClose: 3000 })
      setIsExtractingInsurance(false)
    }
  }

  const processInsuranceFile = (file) => {
    if (!file) return
    
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size must be less than 15MB.', { position: 'top-right', autoClose: 3000 })
      return false
    }

    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      setUploadedInsuranceFile(file)
      setUploadedInsuranceDocument(prev => {
        if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
        return {
          name: file.name || 'insurance-document',
          type: file.type === 'application/pdf' ? 'pdf' : 'image',
          previewUrl: URL.createObjectURL(file),
          revokeOnCleanup: true
        }
      })
      toast.success('Document attached successfully!', { position: 'top-right', autoClose: 2000 })
      return true
    }
    toast.error('Please upload an image or PDF file.', { position: 'top-right', autoClose: 3000 })
    return false
  }

  const handleManualDocumentUpload = async (e) => {
    const file = e.target.files?.[0]
    const success = processInsuranceFile(file)
    e.target.value = ''
    if (success && file && !isManualMode) {
      const canUse = await checkLimit()
      if (!canUse) return
      if (file.type === 'application/pdf') {
        processExtraction(file)
      } else if (file.type.startsWith('image/')) {
        setScanningFile(file)
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    const success = processInsuranceFile(file)
    if (success && file && !isManualMode) {
      const canUse = await checkLimit()
      if (!canUse) return
      if (file.type === 'application/pdf') {
        processExtraction(file)
      } else if (file.type.startsWith('image/')) {
        setScanningFile(file)
      }
    }
  }

  const handleMultipleEndorsementUpload = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`File ${file.name} is larger than 15MB.`, { position: 'top-right', autoClose: 3000 })
        return
      }
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const newItem = createNewEndorsement(file)
        setEndorsements(prev => [...prev, newItem])
        toast.success(`Attached: ${file.name}`, { position: 'top-right', autoClose: 1500 })
      } else {
        toast.error(`Unsupported format for ${file.name}`, { position: 'top-right', autoClose: 3000 })
      }
    })
    e.target.value = ''
  }

  const removeEndorsementItem = (index) => {
    setEndorsements(prev => {
      const target = prev[index]
      if (target?.revokeOnCleanup && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
    toast.info('Endorsement file removed.')
  }

  const handleScannerConfirm = async (processedImageFile) => {
    setScanningFile(null)
    setUploadedInsuranceFile(processedImageFile)
    const canUse = await checkLimit()
    if (canUse) await processExtraction(processedImageFile)
  }

  const handleInputKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const currentTabIndex = parseInt(e.target.getAttribute('tabIndex'), 10)
    if (currentTabIndex === 7) {
      document.querySelector('form')?.requestSubmit()
      return
    }
    const nextInput = document.querySelector(`input[tabIndex="${currentTabIndex + 1}"]`)
    if (nextInput) nextInput.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.issueDate) {
      toast.error('Issue Date is required')
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)

    let uploadedDocumentPath = formData.insuranceDocument;

    if (uploadedInsuranceFile) {
      const formDataUpload = new FormData();
      formDataUpload.append('document', uploadedInsuranceFile);
      try {
        const uploadResponse = await axios.post(`${API_URL}/api/upload/document`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        });
        if (uploadResponse.data.success) {
           uploadedDocumentPath = uploadResponse.data.data.path;
        } else {
           toast.error('Failed to upload document to server');
           setIsSubmitting(false);
           return;
        }
      } catch (err) {
         console.error('Upload Error Detailed:', err);
         if (err.response) {
            console.error('Error Response Data:', err.response.data);
            console.error('Error Response Status:', err.response.status);
            console.error('Error Response Headers:', err.response.headers);
         } else if (err.request) {
            console.error('Error Request:', err.request);
         } else {
            console.error('Error Message:', err.message);
         }
         toast.error(err.response?.data?.message || `Failed to upload document: ${err.message}. Ensure it is not larger than 15MB.`);
         setIsSubmitting(false);
         return;
      }
    }

    const endorsementPaths = []
    for (const item of endorsements) {
      if (item.file) {
        const formDataUpload = new FormData()
        formDataUpload.append('document', item.file)
        try {
          const uploadResponse = await axios.post(`${API_URL}/api/upload/document`, formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true
          })
          if (uploadResponse.data.success) {
            endorsementPaths.push(uploadResponse.data.data.path)
          } else {
            toast.error(`Failed to upload ${item.name} to server`)
            setIsSubmitting(false)
            return
          }
        } catch (err) {
          console.error('Endorsement upload error:', err)
          toast.error(err.response?.data?.message || `Failed to upload endorsement ${item.name}: ${err.message}. Ensure it is not larger than 15MB.`)
          setIsSubmitting(false)
          return
        }
      } else {
        endorsementPaths.push(item.existingUrl)
      }
    }

    const submitData = {
      vehicleNumber: formData.vehicleNumber,
      policyNumber: formData.policyNumber,
      policyHolderName: formData.policyHolderName,
      validFrom: formData.validFrom,
      validTo: formData.validTo,
      tpValidFrom: formData.tpValidFrom,
      tpValidTo: formData.tpValidTo,
      odPremium: formData.odPremium !== '' ? Number(formData.odPremium) : 0,
      tpPremium: formData.tpPremium !== '' ? Number(formData.tpPremium) : 0,
      netPremium: formData.netPremium !== '' ? Number(formData.netPremium) : 0,
      premium: formData.premium !== '' ? Number(formData.premium) : 0,
      issueDate: formData.issueDate,
      insuranceDocument: uploadedDocumentPath,
      endorsementDocument: endorsementPaths[0] || '',
      endorsementDocuments: endorsementPaths,
      insuranceCompany: formData.insuranceCompany,
      insuranceCompanyId: formData.insuranceCompanyId || null,
      insuranceClass: formData.insuranceClass,
      product: formData.product,
      productTypeId: formData.productTypeId || null,
      vehicleClass: formData.vehicleClass,
      remarks: formData.remarks,
      reference: formData.reference,
      referenceId: formData.referenceId || null,
      imd: formData.imd,
      imdId: formData.imdId || null,
      claimRaised: formData.claimRaised,
      claimDate: formData.claimDate,
      claimRemarks: formData.claimRemarks,
      viaAI: usedAiExtraction
    }

    try {
      const request = isEditMode && initialData?._id
        ? axios.put(`${API_URL}/api/insurance/${initialData._id}`, submitData, { withCredentials: true })
        : axios.post(`${API_URL}/api/insurance`, submitData, { withCredentials: true })
      const response = await request
      if (response.data.success) {
        toast.success(isEditMode ? 'Insurance updated successfully!' : 'Insurance added successfully!')
        if (onSubmit) await onSubmit()
        onClose()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save insurance')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <AiLimitModal isOpen={limitModalOpen} onClose={closeLimitModal} used={aiUsed} limit={aiLimit} />
      <div
      className='fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-2 md:p-4'
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] md:max-h-[95vh] overflow-hidden flex flex-col relative' style={{ fontFamily: "'Poppins', sans-serif" }}>
        {isDragOver && (
          <div className='absolute inset-0 z-50 flex items-center justify-center bg-blue-600/90 rounded-xl md:rounded-2xl'>
            <div className='text-white text-center px-6'>
              <svg className='w-12 h-12 mx-auto mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' />
              </svg>
              <p className='text-xl font-bold'>Drop your file here</p>
              <p className='text-sm text-blue-200 mt-1'>PDF or Image (max 15MB)</p>
            </div>
          </div>
        )}
        <div className='bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] p-3 md:p-4 text-white flex-shrink-0'>
          <div className='flex justify-between items-center'>
            <div>
              <h2 className='text-lg md:text-2xl font-bold'>{isEditMode ? 'Edit Insurance' : 'Add New Insurance'}</h2>
              <p className='text-slate-300 text-xs md:text-sm mt-1'>{isEditMode ? 'Update insurance record' : 'Add insurance record'}</p>
            </div>
            <div className='flex items-center gap-1 md:gap-3'>
              <div className='relative overflow-hidden'>
                <button type='button' className='relative px-1.5 py-1 md:px-3 md:py-1.5 bg-white/20 hover:bg-white/30 text-white text-[10px] md:text-sm font-semibold rounded-lg transition flex items-center gap-1 md:gap-2 max-w-full'>
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Doc
                </button>
                <input type='file' accept='image/*, application/pdf' onChange={handleManualDocumentUpload} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer' />
              </div>
              <button onClick={onClose} className='text-white hover:bg-white/20 rounded-lg p-1.5 md:p-2 transition cursor-pointer'>
                <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex-1 overflow-y-auto p-3 md:p-6'>


            <div className='bg-gradient-to-r from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-blue-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
                Policy Details
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Issue Date <span className='text-red-500'>*</span></label>
                  <input type='date' name='issueDate' value={formData.issueDate ? formData.issueDate.split('-').reverse().join('-') : ''} onChange={handleChange} tabIndex='1' className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white' required />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Vehicle Number</label>
                  <div className='relative'>
                    <input type='text' name='vehicleNumber' value={formData.vehicleNumber} onChange={handleChange} onKeyDown={handleInputKeyDown} placeholder='Enter vehicle number' tabIndex='2' className='w-full px-3.5 py-2.5 pr-10 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white' autoFocus />
                  </div>
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Policy Number</label>
                  <input type='text' name='policyNumber' value={formData.policyNumber} onChange={handleChange} onKeyDown={handleInputKeyDown} placeholder='INS001234567' tabIndex='3' className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white' />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Policy Holder Name</label>
                  <input type='text' name='policyHolderName' value={formData.policyHolderName} onChange={handleChange} onKeyDown={handleInputKeyDown} placeholder='Enter policy holder name' tabIndex='4' className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white' />
                </div>
                <div className='md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Insurance Company</label>
                    <select
                      name='insuranceCompanyId'
                      value={formData.insuranceCompanyId}
                      onChange={(e) => {
                        const id = e.target.value
                        const company = insuranceCompanies.find(c => c._id === id)
                        setFormData(prev => ({ ...prev, insuranceCompanyId: id, insuranceCompany: company ? company.name : '' }))
                      }}
                      className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white'
                    >
                      <option value="">Select Company</option>
                      {loadingCompanies ? (
                        <option value="" disabled>Loading...</option>
                      ) : (
                        insuranceCompanies.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Product Type</label>
                    <select name='product' value={formData.product} onChange={handleChange} className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white'>
                      <option value="">Select Product Type</option>
                      {formData.product && !productTypes.some(p => (typeof p === 'string' ? p : p.name) === formData.product) && (
                        <option value={formData.product}>{formData.product}</option>
                      )}
                      {productTypes.map(p => {
                        const name = typeof p === 'string' ? p : p.name
                        return <option key={p._id || name} value={name}>{name}</option>
                      })}
                    </select>
                  </div>

                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Policy Type</label>
                    <select name='insuranceClass' value={formData.insuranceClass} onChange={handleChange} className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white'>
                      <option value="">Select Policy Type</option>
                      <option value="Comprehensive">Comprehensive</option>
                      <option value="Third Party">Third Party</option>
                      <option value="Standalone OD">Standalone OD</option>
                      <option value="Bundle">Bundle</option>
                    </select>
                  </div>
                </div>

                <div className='md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
                  <div className='relative'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <label className='block text-xs md:text-sm font-semibold text-gray-700'>Client Name</label>
                      <button
                        type='button'
                        onClick={() => { setShowAddReference(true); setNewReferenceName('') }}
                        className='text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center cursor-pointer'
                      >
                        <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                        </svg>
                        Add
                      </button>
                    </div>
                    <div className='relative'>
                      <input
                        type='text'
                        value={referenceDropdownOpen ? referenceSearch : formData.reference}
                        onFocus={() => { setReferenceSearch(''); setReferenceDropdownOpen(true) }}
                        onChange={(e) => {
                          const val = e.target.value
                          setReferenceSearch(val)
                          setReferenceDropdownOpen(true)
                          const match = references.find(r => r.name.toLowerCase() === val.trim().toLowerCase())
                          setFormData(prev => ({ ...prev, reference: val, referenceId: match ? match._id : '' }))
                        }}
                        onBlur={() => setTimeout(() => setReferenceDropdownOpen(false), 200)}
                        placeholder='Select or type Client Name...'
                        className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white pr-10'
                      />
                      {formData.reference && !referenceDropdownOpen ? (
                        <button
                          type='button'
                          onClick={() => setFormData(prev => ({ ...prev, reference: '', referenceId: '' }))}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer'
                          title='Clear Client Name'
                        >
                          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type='button'
                          onClick={() => setReferenceDropdownOpen(prev => !prev)}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer'
                        >
                          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                          </svg>
                        </button>
                      )}
                    </div>
                    {referenceDropdownOpen && (
                      <div className='absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto'>
                        {filteredReferences.length > 0 ? (
                          filteredReferences.map((ref) => (
                            <button
                              key={ref._id}
                              type='button'
                              onMouseDown={() => handleReferenceSelect(ref)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition cursor-pointer ${formData.reference === ref.name ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                            >
                              {ref.name}
                            </button>
                          ))
                        ) : (
                          <div className='px-3 py-2 text-sm text-gray-400'>
                            {referenceSearch ? 'No matching Client Name found' : 'No Client Names yet'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className='relative'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <label className='block text-xs md:text-sm font-semibold text-gray-700'>Agent Name (IMD)</label>
                      <button
                        type='button'
                        onClick={() => { setShowAddImd(true); setNewImdName('') }}
                        className='text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center cursor-pointer'
                      >
                        <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                        </svg>
                        Add
                      </button>
                    </div>
                    <div className='relative'>
                      <input
                        type='text'
                        value={imdDropdownOpen ? imdSearch : formData.imd}
                        onFocus={() => { setImdSearch(''); setImdDropdownOpen(true) }}
                        onChange={(e) => {
                          const val = e.target.value
                          setImdSearch(val)
                          setImdDropdownOpen(true)
                          const match = imds.find(r => r.name.toLowerCase() === val.trim().toLowerCase())
                          setFormData(prev => ({ ...prev, imd: val, imdId: match ? match._id : '' }))
                        }}
                        onBlur={() => setTimeout(() => setImdDropdownOpen(false), 200)}
                        placeholder='Select or type Agent name...'
                        className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white pr-10'
                      />
                      {formData.imd && !imdDropdownOpen ? (
                        <button
                          type='button'
                          onClick={() => setFormData(prev => ({ ...prev, imd: '', imdId: '' }))}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer'
                          title='Clear Agent name'
                        >
                          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type='button'
                          onClick={() => setImdDropdownOpen(prev => !prev)}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer'
                        >
                          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                          </svg>
                        </button>
                      )}
                    </div>
                    {imdDropdownOpen && (
                      <div className='absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto'>
                        {filteredImds.length > 0 ? (
                          filteredImds.map((ref) => (
                            <button
                              key={ref._id}
                              type='button'
                              onMouseDown={() => handleImdSelect(ref)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-sky-50 transition cursor-pointer ${formData.imd === ref.name ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-700'}`}
                            >
                              {ref.name}
                            </button>
                          ))
                        ) : (
                          <div className='px-3 py-2 text-sm text-gray-400'>
                            {imdSearch ? 'No matching Agent name found' : 'No Agent names yet'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className='md:col-span-4 mt-3 md:mt-4'>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Notes</label>
                  <textarea name='remarks' value={formData.remarks} onChange={handleChange} rows='2' placeholder='Any additional notes...' className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white resize-none' />
                </div>

              </div>
            </div>

            <div className='bg-gradient-to-r from-sky-50 to-cyan-50 border-2 border-sky-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-sky-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>2</span>
                Validity
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Valid From <span className='text-red-500'>*</span></label>
                  <input type='date' name='validFrom' value={formData.validFrom ? formData.validFrom.split('-').reverse().join('-') : ''} onChange={handleChange} onKeyDown={handleInputKeyDown} tabIndex='5' className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white' required />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Valid To <span className='text-xs text-blue-500'>(Auto-calculated, editable)</span></label>
                  <input type='date' name='validTo' value={formData.validTo ? formData.validTo.split('-').reverse().join('-') : ''} onChange={handleChange} onKeyDown={handleInputKeyDown} tabIndex='6' className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white' />
                </div>
                <div></div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>TP Valid From</label>
                  <input type='date' name='tpValidFrom' value={formData.tpValidFrom ? formData.tpValidFrom.split('-').reverse().join('-') : ''} onChange={handleChange} onKeyDown={handleInputKeyDown} className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white' />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>TP Valid To</label>
                  <input type='date' name='tpValidTo' value={formData.tpValidTo ? formData.tpValidTo.split('-').reverse().join('-') : ''} onChange={handleChange} onKeyDown={handleInputKeyDown} className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white' />
                </div>
                <div></div>
              </div>
            </div>

            <div className='bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-emerald-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>3</span>
                Premium
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>OD Premium (₹)</label>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm'>₹</span>
                    <input
                      type='number'
                      name='odPremium'
                      value={formData.odPremium}
                      onChange={handleChange}
                      placeholder='0'
                      min='0'
                      step='any'
                      tabIndex='7'
                      className='w-full pl-8 pr-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white'
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>TP Premium (₹)</label>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm'>₹</span>
                    <input
                      type='number'
                      name='tpPremium'
                      value={formData.tpPremium}
                      onChange={handleChange}
                      placeholder='0'
                      min='0'
                      step='any'
                      tabIndex='8'
                      className='w-full pl-8 pr-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white'
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Net Premium (₹)</label>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm'>₹</span>
                    <input
                      type='number'
                      name='netPremium'
                      value={formData.netPremium}
                      onChange={handleChange}
                      placeholder='0'
                      min='0'
                      step='any'
                      tabIndex='9'
                      className='w-full pl-8 pr-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white'
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Gross Premium (₹)
                    <span className='ml-1 text-xs text-emerald-600 font-normal'>Total incl. GST</span>
                  </label>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm'>₹</span>
                    <input
                      type='number'
                      name='premium'
                      value={formData.premium}
                      onChange={handleChange}
                      placeholder='0'
                      min='0'
                      step='any'
                      tabIndex='10'
                      className='w-full pl-8 pr-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white'
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-300 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-slate-700 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>4</span>
                Claim Details
              </h3>
              <div className='flex items-center gap-3 mb-4'>
                <button
                  type='button'
                  onClick={handleClaimToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    formData.claimRaised ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.claimRaised ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className='text-sm font-semibold text-gray-700'>
                  {formData.claimRaised ? 'Claim raised' : 'No claim raised'}
                </span>
              </div>
              {formData.claimRaised && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Claim Date</label>
                    <input
                      type='date'
                      name='claimDate'
                      value={formData.claimDate ? formData.claimDate.split('-').reverse().join('-') : ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value) {
                          const [year, month, day] = value.split('-')
                          setFormData(prev => ({ ...prev, claimDate: `${day}-${month}-${year}` }))
                        } else {
                          setFormData(prev => ({ ...prev, claimDate: '' }))
                        }
                      }}
                      className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white'
                    />
                  </div>
                  <div className='md:col-span-2'>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Claim Remarks</label>
                    <textarea
                      name='claimRemarks'
                      value={formData.claimRemarks}
                      onChange={handleChange}
                      rows='2'
                      placeholder='Any remarks about the claim...'
                      className='w-full px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white resize-none'
                    />
                  </div>
                </div>
              )}
            </div>

            <div className='bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              {/* Header row with title and + button */}
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-base md:text-lg font-bold text-gray-800 flex items-center gap-2'>
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.414 6.586a6 6 0 108.484 8.484L20.5 13" />
                  </svg>
                  Endorsement Documents
                  {endorsements.length > 0 && (
                    <span className='bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0'>
                      {endorsements.length}
                    </span>
                  )}
                </h3>
                {/* + Add button always visible */}
                <div className='relative overflow-hidden flex-shrink-0'>
                  <button
                    type='button'
                    className='flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-sm'
                    title='Add endorsement file(s)'
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                  <input
                    type='file'
                    multiple
                    accept='image/*, application/pdf'
                    onChange={handleMultipleEndorsementUpload}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                  />
                </div>
              </div>

              {/* Empty-state dashed drop-zone */}
              {endorsements.length === 0 ? (
                <div className='relative overflow-hidden'>
                  <div className='border-2 border-dashed border-indigo-300 rounded-xl py-8 px-4 flex flex-col items-center gap-2 bg-white/40 hover:bg-white/60 transition cursor-pointer'>
                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className='text-sm font-semibold text-indigo-700'>Click or drop endorsement files here</p>
                    <p className='text-xs text-indigo-500'>PDF, JPG, PNG — max 15 MB each · Multiple files allowed</p>
                  </div>
                  <input
                    type='file'
                    multiple
                    accept='image/*, application/pdf'
                    onChange={handleMultipleEndorsementUpload}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                  />
                </div>
              ) : (
                <div className='space-y-2'>
                  {endorsements.map((endo, idx) => (
                    <div key={idx} className='flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2.5 border border-indigo-200 shadow-sm'>
                      <div className='min-w-0 flex items-center gap-2'>
                        <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${endo.type === 'pdf' ? 'bg-red-100' : 'bg-blue-100'}`}>
                          {endo.type === 'pdf' ? (
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className='min-w-0'>
                          <p className='text-sm font-semibold text-slate-800 truncate'>{endo.name}</p>
                          <p className='text-[10px] text-slate-400 uppercase font-semibold'>{endo.type === 'pdf' ? 'PDF' : 'Image'}</p>
                        </div>
                      </div>
                      <button
                        type='button'
                        onClick={() => removeEndorsementItem(idx)}
                        className='flex-shrink-0 flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer'
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploadedInsuranceDocument && (
              <div className='bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
                <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                  <span className='bg-slate-700 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>5</span>
                  Uploaded Insurance Document
                </h3>
                <div className='mb-3 flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 border border-slate-200'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-slate-800 truncate'>{uploadedInsuranceDocument.name}</p>
                    <p className='text-xs text-slate-500'>{uploadedInsuranceDocument.type === 'pdf' ? 'PDF preview' : 'Image preview'}</p>
                  </div>
                </div>
                {uploadedInsuranceDocument.type === 'pdf' ? (
                  <iframe src={uploadedInsuranceDocument.previewUrl} title='Uploaded Insurance PDF' className='w-full h-80 rounded-xl border border-slate-200 bg-white' />
                ) : (
                  <div className='rounded-xl border border-slate-200 bg-white p-2'>
                    <img src={uploadedInsuranceDocument.previewUrl} alt='Uploaded Insurance document' className='w-full max-h-80 object-contain rounded-lg' />
                  </div>
                )}
              </div>
            )}

            {endorsements.map((endo, idx) => (
              <div key={idx} className='bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
                <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                  <span className='bg-indigo-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>{idx + 1}</span>
                  Uploaded Endorsement Document: {endo.name}
                </h3>
                {endo.type === 'pdf' ? (
                  <iframe src={endo.previewUrl} title={`Uploaded Endorsement PDF ${idx}`} className='w-full h-80 rounded-xl border border-slate-200 bg-white' />
                ) : (
                  <div className='rounded-xl border border-slate-200 bg-white p-2'>
                    <img src={endo.previewUrl} alt={`Uploaded Endorsement document ${idx}`} className='w-full max-h-80 object-contain rounded-lg' />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className='border-t border-gray-200 p-3 md:p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-3 flex-shrink-0'>

            <div className='flex gap-2 md:gap-3 w-full md:w-auto'>
              <button type='button' onClick={onClose} className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition cursor-pointer'>Cancel</button>
              <button type='submit' disabled={isSubmitting} className='flex-1 md:flex-none px-6 md:px-8 py-2 bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg shadow-md shadow-blue-700/20 hover:from-blue-800 hover:to-blue-700 font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>{isSubmitting ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Insurance' : 'Add Insurance')}</button>
            </div>
          </div>
        </form>
      </div>
      {scanningFile && (
        <DocumentScannerPreview
          file={scanningFile}
          onCancel={() => setScanningFile(null)}
          onConfirm={handleScannerConfirm}
        />
      )}

      {showAddReference && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/40' onClick={() => { setShowAddReference(false); setNewReferenceName(''); setNewReferenceMobile(''); setNewReferenceEmail(''); setNewReferenceReference(''); setNewReferenceAddress(''); setNewReferenceOtherInfo('') }}>
          <div className='bg-white rounded-xl shadow-2xl p-5 w-80 mx-4 max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <h3 className='text-base font-bold text-gray-800 mb-3'>Add New Client Name</h3>
            <input
              type='text'
              value={newReferenceName}
              onChange={(e) => setNewReferenceName(e.target.value)}
              placeholder='Client Name (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-2'
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddReference() }}
            />
            <input
              type='text'
              value={newReferenceMobile}
              onChange={(e) => setNewReferenceMobile(enforceMobileNumberFormat(e.target.value))}
              placeholder='Mobile (optional)'
              maxLength={10}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddReference() }}
            />
            <input
              type='email'
              value={newReferenceEmail}
              onChange={(e) => setNewReferenceEmail(e.target.value)}
              placeholder='Email (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddReference() }}
            />
            <input
              type='text'
              value={newReferenceReference}
              onChange={(e) => setNewReferenceReference(e.target.value)}
              placeholder='Reference (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddReference() }}
            />
            <input
              type='text'
              value={newReferenceAddress}
              onChange={(e) => setNewReferenceAddress(e.target.value)}
              placeholder='Address (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddReference() }}
            />
            <input
              type='text'
              value={newReferenceOtherInfo}
              onChange={(e) => setNewReferenceOtherInfo(e.target.value)}
              placeholder='Other Info (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-4'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddReference() }}
            />
            <div className='flex justify-end gap-2'>
              <button type='button' onClick={() => { setShowAddReference(false); setNewReferenceName(''); setNewReferenceMobile(''); setNewReferenceEmail(''); setNewReferenceReference(''); setNewReferenceAddress(''); setNewReferenceOtherInfo('') }} className='px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-semibold cursor-pointer'>Cancel</button>
              <button type='button' onClick={handleAddReference} className='px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold cursor-pointer'>Add</button>
            </div>
          </div>
        </div>
      )}

      {showAddImd && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/40' onClick={() => { setShowAddImd(false); setNewImdName(''); setNewImdMobile(''); setNewImdEmail(''); setNewImdAgentCode(''); setNewImdReference(''); setNewImdAddress(''); setNewImdOtherInfo('') }}>
          <div className='bg-white rounded-xl shadow-2xl p-5 w-80 mx-4 max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <h3 className='text-base font-bold text-gray-800 mb-3'>Add New Agent name</h3>
            <input
              type='text'
              value={newImdName}
              onChange={(e) => setNewImdName(e.target.value)}
              placeholder='Agent Name (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2'
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddImd() }}
            />
            <input
              type='text'
              value={newImdMobile}
              onChange={(e) => setNewImdMobile(enforceMobileNumberFormat(e.target.value))}
              placeholder='Mobile (optional)'
              maxLength={10}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddImd() }}
            />
            <input
              type='email'
              value={newImdEmail}
              onChange={(e) => setNewImdEmail(e.target.value)}
              placeholder='Email (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddImd() }}
            />
            <input
              type='text'
              value={newImdAgentCode}
              onChange={(e) => setNewImdAgentCode(e.target.value)}
              placeholder='Agent Code (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddImd() }}
            />
            <input
              type='text'
              value={newImdReference}
              onChange={(e) => setNewImdReference(e.target.value)}
              placeholder='Reference (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddImd() }}
            />
            <input
              type='text'
              value={newImdAddress}
              onChange={(e) => setNewImdAddress(e.target.value)}
              placeholder='Address (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddImd() }}
            />
            <input
              type='text'
              value={newImdOtherInfo}
              onChange={(e) => setNewImdOtherInfo(e.target.value)}
              placeholder='Other Info (optional)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-4'
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddImd() }}
            />
            <div className='flex justify-end gap-2'>
              <button type='button' onClick={() => { setShowAddImd(false); setNewImdName(''); setNewImdMobile(''); setNewImdEmail(''); setNewImdAgentCode(''); setNewImdReference(''); setNewImdAddress(''); setNewImdOtherInfo('') }} className='px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-semibold cursor-pointer'>Cancel</button>
              <button type='button' onClick={handleAddImd} className='px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold cursor-pointer'>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default AddInsuranceModal
