const config = require('./config');

const requests = {};

let activeUsers = 0;

let authenticationAttempts = {}

let failed_orders = 0;

let revenue = 0;

let totalItems = 0;

let endpointLatency;

let pizzaLatency;




//these functions are for tracking stuff like memory usage 
// and cpu stuff
const os = require('os');

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return Math.floor(memoryUsage)//.toFixed(2); //ask chatgpt how to make an int
}

function getActiveUsers() {

}


// this function is to track how many times the endpoints are called. In 
// the end these should use all 4 of them. 

function track(endpoint) {
  return (req, res, next) => {
    const startTime = Date.now();
    const response = res.body;
    const method = req.method;
    const status = res.statusCode;

    
    //
    if(endpoint == "auth" && (method == "PUT" || method == "POST")){
        console.log(status)
        activeUsers += 1
        if(status === 200){
            authenticationAttempts["success"] = (authenticationAttempts["success"] || 0) +1;
        }
        else{
            console.log("pushed a failure to authorize")
            authenticationAttempts["failure"] = (authenticationAttempts["failure"] || 0) + 1;
        }
    }
    if(endpoint == "auth" && method == "DELETE"){
        activeUsers -= 1
    }

    // the stuff to get the number of pizza's ordered and the revenue per minute/ failed orders
    if(endpoint === "order" && method === "POST"){
        const originalSend = res.send;
        //what the frick just happened? None of the console logs are printing now
        //console.log("this is the res.send body: ", res.send(body));
        res.send = function (body) {
            if(status === 200){
                console.log(body.order);
                const numberOfItems = body.order.items.length;

                    // console.error("body at error time:", body);
                const totalCost = body.order.items.reduce((total, item) => total + item.price, 0);
                //totalCost = Math.floor(totalCost);
                console.log("totalCost: ", totalCost);
                console.log("number of pizzas: ", numberOfItems)
                // Send order cost to Grafana
                revenue += totalCost;
                totalItems += numberOfItems;
            }
            else{
                failed_orders += 1;
            }
            return originalSend.call(this, body);
            //the following are two lines I"ve added let's see if this works... 
            // res.send = originalSend;
            // console.log("this is the res.send(body)");
            // console.log(res.send(body));
            // return res.send(body);
        };
        res.on('finish', () => {
            pizzaLatency = Date.now() - startTime;
            console.log("Pizza Latency: ", pizzaLatency)
        });

    }

    res.on('finish', () => {
        endpointLatency = Date.now() - startTime; // Calculate latency in ms
    });
  
    //const key = `${endpoint}:${method}`;
    //come back and change this if you need more information
    requests[method] = (requests[method] || 0) + 1;
    requests["total"] = (requests["total"] || 0 ) + 1;
    next();
  };
}



// need to add a function that tracks purchase metrics 
//this means 
//This includes how long it took for the Pizza Factory to 
//respond to the request to make a pizza, how many were made,
// how much it cost, and if it was successful.














// This will periodically send metrics to Grafana
const timer = setInterval(() => {
  Object.keys(requests).forEach((endpoint) => {
    sendMetricToGrafana('requests', requests[endpoint], { endpoint });
  });
  Object.keys(authenticationAttempts).forEach((key) => {
    sendMetricToGrafana('authenticationAttempts', authenticationAttempts[key], {key})

  });
    // Send CPU usage metrics
    //changing it so it gets sent as a double
    const cpuUsage = getCpuUsagePercentage();
    sendMetricToGrafana('cpu_usage', cpuUsage, { source: config.metrics.source });

    // Send memory usage metrics
    const memoryUsage = getMemoryUsagePercentage();
    sendMetricToGrafana('memory_usage', memoryUsage, { source: config.metrics.source });
    // send active users to grafana
    sendMetricToGrafana('active_users', activeUsers, {source: config.metrics.source} );

    sendMetricToGrafanaCost('order_total_amount', revenue, { source: config.metrics.source });

    sendMetricToGrafana('number_of_items', totalItems, { source: config.metrics.source });

    sendMetricToGrafana('failed_orders', failed_orders, { source: config.metrics.source });

    sendMetricToGrafana('endpointLatency', endpointLatency, { source: config.metrics.source } );

    sendMetricToGrafana('pizzaLatency', pizzaLatency, { source: config.metrics.source });

}, 10000);





function sendMetricToGrafana(metricName, metricValue, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: '1',
                sum: {
                  dataPoints: [
                    {
                      asInt: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [],
                    },
                  ],
                  aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  Object.keys(attributes).forEach((key) => {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        console.error('Failed to push metrics data to Grafana');
        console.log(`this is the metric ${metricName}`)
      } else {
        //console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      //console.error('Error pushing metrics:', error);
    });
}


function sendMetricToGrafanaCost(metricName, metricValue, attributes) {
    attributes = { ...attributes, source: config.metrics.source };
  
    const metric = {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: [
                {
                  name: metricName,
                  unit: '1.0',
                  sum: {
                    dataPoints: [
                      {
                        asDouble: metricValue,
                        timeUnixNano: Date.now() * 1000000,
                        attributes: [],
                      },
                    ],
                    aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                    isMonotonic: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  
    Object.keys(attributes).forEach((key) => {
      metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
        key: key,
        value: { stringValue: attributes[key] },
      });
    });
  
    fetch(`${config.metrics.url}`, {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
    })
      .then((response) => {
        if (!response.ok) {
          //console.error('Failed to push metrics data to Grafana');
          //console.log(`this is the metric ${metricName}`)
        } else {
          //console.log(`Pushed ${metricName}`);
        }
      })
      .catch((error) => {
        //console.error('Error pushing metrics:', error);
      });
  }






module.exports = { track };