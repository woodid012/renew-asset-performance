const [assets, setAssets] = useState({
  '1': {
    id: '1',
    name: 'Solar Farm Alpha',
    state: 'NSW',
    capacity: 100,
    type: 'solar',
    volumeLossAdjustment: 95,
    contracts: [
      {
        id: '1',
        counterparty: "Corporate PPA 1",
        type: 'bundled',
        buyersPercentage: 40,
        shape: 'solar',
        strikePrice: '75',
        greenPrice: '30',
        blackPrice: '45',
        indexation: 2.5,
        hasFloor: true,
        floorValue: '70',
        startDate: '2024-01-01',
        endDate: '2028-12-31',
        term: '5'
      },
      {
        id: '2',
        counterparty: "Retail PPA",
        type: 'bundled',
        buyersPercentage: 30,
        shape: 'solar',
        strikePrice: '85',
        greenPrice: '45',
        blackPrice: '40',
        indexation: 2.0,
        hasFloor: false,
        floorValue: '',
        startDate: '2024-01-01',
        endDate: '2026-12-31',
        term: '3'
      }
    ]
  },
  '2': {
    id: '2',
    name: 'Wind Farm Beta',
    state: 'VIC',
    capacity: 150,
    type: 'wind',
    volumeLossAdjustment: 95,
    contracts: [
      {
        id: '1',
        counterparty: "Green PPA",
        type: 'green',
        buyersPercentage: 35,
        shape: 'wind',
        strikePrice: '45',
        greenPrice: '',
        blackPrice: '',
        indexation: 2.0,
        hasFloor: false,
        floorValue: '',
        startDate: '2024-01-01',
        endDate: '2029-12-31',
        term: '6'
      },
      {
        id: '2',
        counterparty: "Corporate PPA 2",
        type: 'bundled',
        buyersPercentage: 25,
        shape: 'wind',
        strikePrice: '100',
        greenPrice: '28',
        blackPrice: '72',
        indexation: 2.5,
        hasFloor: true,
        floorValue: '0',
        startDate: '2024-07-01',
        endDate: '2034-06-31',
        term: '10'
      }
    ]
  }
});