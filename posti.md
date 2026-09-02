
Sending Code API

The Sending Code API lets you generate a short code that replaces a printed shipping label.

    The code is 6 characters long, using numbers (0–9) and letters (A–F).
    You can write this code directly on the parcel instead of attaching a label.

With this API you can:

    Create a new sending code for a shipment
    Retrieve a sending code if it already exists
    Look up shipment details by sending code

Authentication

Posti APIs are secured with authentication and authorization flows based on OAuth 2.0. The production credentials (client ID and secret) can be ordered from the LogEDI@posti.com. Required information in the credentials order: Posti contract number, Organization number (Business ID), contact information.
Requesting the token

    The request must be an HTTP POST request.
    The request must include a Content-Type header with the value of application/x-www-form-urlencoded.
    The body of the request must have:
    grant_type=client_credentials
    client_id=<User ID>
    client_secret=<User secret>

Production authentication token request URL:
https://gateway-auth.posti.fi/api/v1/token

Sample access token cURL request:

curl -X POST https://gateway-auth.posti.fi/api/v1/token \
--header "Content-Type: application/x-www-form-urlencoded" \
--data-urlencode "grant_type=client_credentials" \
--data-urlencode "client_id=<DEMO-USER-ID>" \
--data-urlencode "client_secret=<DEMO-SECRET-ID>"
            

Receiving the access token

If the client is successfully authenticated, an access token is returned. The content of the token_value is encrypted. The targets list the available APIs that are allowed to be used with the token.

{
  "access_token": "",
  "token_type": "Bearer",
  "expires_in": 3600,
  "posti_fi": {
    "targets": {
      "2025-04": {
        "url": "https://gateway.posti.fi/2025-04",
        "tier": 0
      }
    }
  }
}

            

Using the access token

To use the access token to authenticate API request, construct a normal HTTPS request and include an Authorization header with the value of Bearer <token_value>.

Sample Sending Code API cURL request:

curl -X POST https://gateway.posti.fi/2025-04/labelless \
--header "Content-Type: application/json" \
--header "Authorization: Bearer <token_value>" \
--data "{'searchCriteria': {'trackingNumber': 'JJFI65432100000000224'}}"
            

Access token expiration

Access tokens obtained from the token endpoint expire in one hour (3600 seconds).
Instructions

You can view the OpenAPI specification here.
General conventions

Pickup Point API is part of Posti APIs and follows a long-term version numbering, visible in the path in “yyyy-mm” format. Yearly releases will be published, and each version is supported for three years.
Environments

Currently only a production environment is available for customers.

Production Sending Code API endpoints

    Create a sending code for a shipment

    POST https://gateway.posti.fi/2025-04/labelless

    Retrieve sending code by tracking number

    GET https://gateway.posti.fi/2025-04/labelless/{trackingNumber}

    Get shipment details by sending code

    GET https://gateway.posti.fi/2025-04/labelless/shipment/{sendingCode}

Request format

    Provide the trackingNumber of the shipment you want a code for.
    (Optional) Add "validation": {"noEdiCheck": true} if you want to bypass the EDI check. Normally, the system ensures the shipment has EDI data before creating a code.

{
  "searchCriteria": {
    "trackingNumber": " JJFI65432100000000224"
  },
  "validation": {
    "noEdiCheck": true
  }
}
            

Response format

You’ll get a list of shipments with their sending codes.

Example:

{
  "shipments": [
    {
      "trackingNumber": " JJFI65432100000000224",
      "sendingCode": "654321"
    }
  ]
} 
            





Authentication API

Posti API uses OAuth 2.0 to provide authorized access to its services

Important: The SSL/TLS certificate will be replaced in the old OAuth domains

We are updating the SSL/TLS certificate for the old oauth.posti.com and oauth.posti.fi domains.

If you are still using these old domains, please review the details and update your configuration as needed.

If you are already using the new oauth2.posti.com domain, no action is required.

Overview

Posti API uses OAuth 2.0 protocol for authentication and authorization. The OAuth 2.0 is a secure and standard authentication protocol that provides sending authorized requests to the Posti API services.

The authentication flow follows these steps:

    A client application uses Posti service account username and password via HTTP Basic Authentication to exchange these credentials for an access token
    When accessing the protected API service, the client application uses the access token to authenticate

NOTE! When using the Posti service account, please make sure not to store secrets (including API keys, passwords, authorization tokens, encryption keys, certificates and other credentials) in plain text on public resources that are accessible to anyone on the Internet, such as public Postman collections or workspaces, public GitHub repositories and other public resources. Use only private Postman collections and workspaces, private GitHub repositories, etc. that only authorized users can access.
How to get Posti service account

If your business does not have a Posti service account, contact Posti Customer Service to get one. Note that you also need a contract with Posti.
How to test Posti service account

Replace accountname:secret using Posti service account details which Posti has provided to you.

Example request:

curl -H "Accept: application/json" --user "accountname:secret" https://oauth2.posti.com/oauth/token -d grant_type=client_credentials
	    

Accessing Posti API services
API Endpoints
Environment 	Protocol 	Host 	Path
QA 	HTTPS 	oauth2.barium.posti.com 	/oauth/token
UAT 	HTTPS 	oauth2.barium.posti.com 	/oauth/token
Prod 	HTTPS 	oauth2.posti.com 	/oauth/token
Step 1: Encode username and password

Concatenate the username, a colon character ":", and the password into a single string. After that, Base64 encode the single string.

Credentials:
    accountname:secret
Base64 encoded value:
    YWNjb3VudG5hbWU6c2VjcmV0

Step 2: Get access token from Authorization Server

Before your application can access Posti API services, it must obtain an access token that grants access to the services. A single access token can grant access to multiple services where you have authorization.

The value calculated in Step 1 must be exchanged for a access token by making a HTTP POST request to Authorization Server's access token endpoint. The request must include an Authorization header with the value of "Basic <Base64 encoded value from Step 1>". Url parameter grant_type=client_credentials must also be included to the request.

Access token endpoint:
    https://oauth2.posti.com/oauth/token

Example request:

POST https://oauth2.posti.com/oauth/token?grant_type=client_credentials
Headers: Accept: application/json
         Authorization: Basic YWNjb3VudG5hbWU6c2VjcmV0
...

Example response:

{"token_type":"bearer", "access_token": "abc123", "expires_in": 3599}

Step 3: Authenticate API requests with the access token

The access token may be used to issue requests to Posti API endpoints. To use the access token, construct a normal HTTPS request and include an Authorization header with the value of "Bearer <access token value from Step 2>".

Default expiration time is one hour. After that the client application has to request a new access token.

Example request:

GET https://api.posti.fi/estimation/v1/00100/FI/99710/FI/2103?time=2017-10-03T09:00:00.000%2B0300
Headers: Authorization: Bearer abc123
...

Status codes
Status 	Error 	Message 	Meaning
401 	Unauthorized 	Bad credentials 	Wrong username or password or account is locked for 1 hour after 5 invalid login attempts.



Shipments API V3

Confirm shipments and generate or add tracking information

Shipments API is meant for dropshipping Suppliers to receive orders from Retailers and confirm those orders. Retailer use always the Order API. If the order has products from multiple Suppliers then the Glue split the order to multiple shipments. Shipments API allows to receive your shipments, update status information, register your deliveries, retrieve tracking codes for them, and generate parcel labels for them.

Supplier will first fetch the shipments generated from Retailer's sales orders. The status information supplier adds to shipments will also be copied to the original sales order that retailer places, so the retailer will also be able to track the status of the shipments related to their orders.

Glue has following options to create address label, tracking ID and EDI for shipments:

    Glue generates all required information for deliveries.
    Glue uses integration with Unifaun to to generate address label, tracking and EDI for the delivery. This is used by some Retailers which have Unifaun in use. If Retailer use this option but you decide to your use your own system, then you should support service codes for deliveries used by the Unifaun.
    You can use own system. You should update shipment information with tracking ID when confirming the shipment.

As with other requests to the system, user must be authenticated as described in Posti Authentication API.

Older V2 documentation can be found here.

All new implementations shall use version 3 of the Shipments API.
API Endpoints
Environment 	Protocol 	Host
Test 	HTTPS 	argon.ecom-api.posti.com
Prod 	HTTPS 	ecom-api.posti.com

API response codes can be found here.
Sequence of shipment flow
GlueShipmentV3Process

In the most common case supplier will:

    poll periodically for new shipments
    update shipment status
    confirm shipment
    with tracking ID, EDI of the delivery, and delivery note from your own system
    Glue provides tracking ID, address labels, and delivery note


Field name 	Description
shipmentId 	Unique shipment identifier generated by GLUE.
externalId 	Supplier’s own reference. For example, you use it store your own order ID. The value is not shown to Retailer.
clientId 	Suppliers business ID.
metadata 	 
metadata.sourceOrganization 	Retailers business ID.
metadata.insertDate 	Timestamp when shipment was generated by GLUE from retailers order
metadata.updateDate 	Timestamp when shipment was last updated.
metadata.documentTyepe 	Defines order type. For dropshipping SalesOrder is used
references 	Retailer’s addtional references.
references.name 	Allowed values:

PO - Retailer’s purchase order ID

SO - Retailer’s sales order ID
references.value 	Value of the reference
createdDate 	Automatic timestamp when shipment was created by GLUE.
status 	Current status of the shipment
status.value 	Allowed values:

Created, Submitted, Viewed, Picking, Packing, Shipping, Cancelled, Delivered, Error

Status descriptions can be found here.
status.timestamp 	Date and time when this status was added
consignment 	Order information from Retailer
consignment.reference 	Retailer’s order number. Normally this is sales order number which is available for the Retailer’s end-customer (order ID used by online shop).
consignment. contractNumber 	Payers contract number for the delivery. Each retailer has their own contract number for each delivery operator. In case of Posti, this is 6 digit number starting with number 6 (e.g. “612345”)
consignment.orderDate 	Order date provided by Retailer. PS! Might be different from “createdDate” value because orderDate is provided by Retailer and “createdDate” is added by system.
consignment.vendor 	Retailer’s name and address. Printed on delivery note. consignment.vendor.externalId is reserved for Retailer’s ID (normally business ID) to map it with Supplier’s own ID for the retailer.
consignment.sender 	Parcel deliveries:

Retailer’s name and address which shall be used as sender on parcel label and EDI of the delivery information.
Freight deliveries:

Pick-up address for freight delivery.
consignment.client 	Retailers customer who has purchased goods from online shop
consignment.recipient 	Obsolete - do not use. This is available to ensure backwards compatibility with version 2 of the Orders API.
consignment.deliveryAddress 	This section includes recipient's address, email and mobile phone number for the delivery. consignment.deliveryAddress.name can include new line (\n) to separate recipients name from pickup point name e.g. "Firstname Surname\nc/o Pickup point name". You can split those to two address fields or keep them on the same field.
consignment.deliveryOperator 	Requested delivery operator. Allowed values: Posti - serviceCode’s are Posti’s service codes. Unifaun - serviceCode’s are nShifts’s service codes. This requires that you have valid API keys for nShift’s integration.
consignment.rows 	Array or order rows
consignment.rows.itemId 	Product Id of Supplier’s product. Glue uses this value to handle allocations for correct product.
consignment.rows.productEANCode 	Product EAN code.
consignment.rows.externalWarehouseId 	ID of the Retailer’s product catalog which identifies Supplier (string). Value is normally Supplier’s business ID.
consignment.rows.quantity 	Quantity of ordered products
consignment.rows.productDescription 	Product name for the delivery note
consignment.parcels 	Array of parcels. Parcel is a object that contains products, delivery method and tracking information about the delivery. By default Glue generates one parcel and adds all ordered product rows to that parcel. Tracking codes, address labels and delivery notes are generated based on parcels. Each parcel will have it’s own labels and tracking code.
consignment.parcels.packageType 	By default filled by Glue with value PC (Parcel). Field is informative.
consignment.parcels.serviceCode 	Delivery method. Make sure with Retailer that proper delivery method is used for your shipments. This can include the delivery method for shipment in the following format:

Posti’s service code e.g. “2103” for Postipaketti

nShift’s (Unifaun) service code e.g. “PO2103” for Postipaketti.
Supported service codes are listed at: https://api.posti.fi/resources/SupportedServiceCodes.pdf Note that the list does not mention the 2W prefix but it is possible for those Retailer’s who are using v2 version of the Orders API.
consignment.parcels.deliveryOperator 	Requested delivery operator. Allowed values: Posti - serviceCode’s are Posti’s service codes. Unifaun - serviceCode’s are nShifts’s service codes.
consignment.parcels.parcelId 	Parcel identifier. By default Glue generates value 1. If supplier creates multiple parcels then unique id-s must be given to additional parcels. Tracking codes, address labels and delivery notes are generated based on parcels. Each parcel will have it’s own labels and tracking code.
consignment.parcels.addtionalServices 	Value added services used for the delivery. You should agree with Retailer if your products require any value added services, for example “Fragile”, “Oversized” or “LQ process”. You should add value added services even when Retailer does not send the information and product cannot be delivered without those. If product data is containing oversize and/or fragile information then GLUE automatically adds these value added services to the order. Supported value added services are listed at: https://api.posti.fi/resources/SupportedServiceCodes.pdf
consignment.parcels.pickupPointId 	ID of the pick-up point (e.g. 001003200). For Posti this is the the same value with pupCode which is provided by Location API (see more at developer.posti.fi). The value includes post code combined with with routing service code (see below).
consignment.parcels.routingServiceCode 	Routing service code of the pick up point. This is additional identifier of the pick-up point (e.g. 3200).

Glue provides also option to fast confirm shipments. In this case supplier don't need to provide anything more then shipment ID.

When developing the integration, please note the use of the following fields in response message (shipment API model has more fields, but these are most important from the processing of the shipment point of view):
Polling for new shipments

Shipments should be polled using endpoint:

GET {{glueApiUrl}}/ecommerce/v3/shipments?from=yyyy-mm-ddThh:mm:ssZ&status=Created,Viewed

API returns all new shipments that have been generated after provided timestamp.

This endpoint returns all shipments in an array. All following steps (confirming etc.) are done for each shipment separately.

Supplier needs to store last polling time in own system so on next polling they can use previous polling timestamp.

Whan you receive shipment you will get also requested delivery method and additional services added by Glue or retailer. Glue may add addtional services based on your product information, for eample in case where the product has “Fragile” option available. You can confirm shipment without changing them - in that case requested delivery method is confirmed for the actual delivery. You have option to change the delivery method or add additional services if needed while confirming the shipment.

PS! Note that response is paginated.

Response contains object “page”:

  "page": {
    "size": 20,
    "totalElements": 3,
    "totalPages": 1,
    "number": 0
  }
  

Default page size is 20. You can increase it with query parameter “size=XXX”

“totalElements” - declare that response has 3 shipments that match the search criteria.

If “totalPages” > 1 then it means that you need to make another query with same conditions and define next page number with parameter “&page=X”. Default page number is 0. In a nutshell if first response has “totalPages” > 1 then you need to loop through all the pages.

Find full schema description here.
Update shipment status

Supplier has option to update shipment status at any given time.

PATCH {{glueApiUrl}}/ecommerce/v3/shipments/{{shipmentId}}
Example payload

{
  "status": {
    "value": "Viewed"
  }
}
    

After status update API returns updated shipment JSON in response. Supplier MUST save this JSON to own system because the shipment contains new information and status. When supplier is not overwriting their local copy with API response there will be issue when supplier overwrites shipment stored in Glue with older data from their local copy.

Possible statuses can be found here.

Find full schema description here.
Confirming shipment

Supplier can confirm shipments in multiple ways.

    Glue can generate tracking ID and address label for the delivery, using its' internal functions or Unifaun
    Supplier can provide their own tracking ID while confirming the shipment

In both previous cases there is also option to split shipment into multiple parcels. By default Glue generates one parcel for the shipment and places all ordered products there.

Supplier can add additional parcel to shipment and rearrange products between parcels.

    If delivery is provided directly by Posti (not using Posti through Unifaun) and all ordered amounts are delivered then its possible to use “fast confirm” endpoint. In that case Glue will generate tracking information and address labels + deliveredQuantities will match ordered quantities and status of the shipment is set to Delivered.

Confirming shipment and using Glue to generate tracking information and address labels

If supplier wants to use Glue generated tracking information and parcel labels then confirmation message for one parcel shipment looks as follows:

PATCH {{glueApiUrl}}/ecommerce/v3/shipments/{{shipmentId}}
Example payload

{
  "status": {
    "value": "Delivered"
  },
  "consignment": {
    "parcels": [
      {   "parcelId": "1",
        "packageType": "PC",
        "ready":true,
        "rows": [
          {
            "externalWarehouseId": "01093579",
            "itemId": "0109357-9-5002",
            "deliveredQuantity":1,
            "quantity": 1.0
          }
        ]
      }
    ]
  }
}
    

This payload confirms that ordered row with "0109357-9-5002" was delivered with the same amount that was ordered.

In response you can get the the tracking codes Glue generated from trackingCodes array. If there is more then one parcel then it will contain tracking codes for all parcels.

Parcel address label, delivery note and tracking code can be read from the corresponding parcel.

If you need to change the delivery method then include “serviceCode” and “deliveryOperator” values in the confirmation json.
Response
Confirming shipment with tracking information from external system

If supplier use own or third party system to generate tracking code(s) then these values can be provided inside “trackingCodes” array.

Note that response is not containing document “label”. This is because you have provided external tracking code(s) and GLUE does not generate address label. Only delivery note is generated.

PATCH {{glueApiUrl}}/ecommerce/v3/shipments/{{shipmentId}}
Example payload

{
  "status": {
    "value": "Delivered"
  },
  "consignment": {
    "parcels": [
      {   "parcelId": "1",
        "packageType": "PC",
        "ready":true,
        "trackingCodes": [
          "EXTERNALLY GENERATED TRACKING CODE"
        ],
        "rows": [
          {
            "externalWarehouseId": "01093579",
            "itemId": "0109357-9-5002",
            "deliveredQuantity":1,
            "quantity": 1.0
          }
        ]
      }
    ]
  }
}
    

Divide shipment into multiple parcels and confirming them

If there is a need to split shipment into multiple parcels (to big object etc.) then this can be done using same PUT endpoint.

What is important is that by adding new parcel object you need also provide following values to new parcel:

    unique “parcelId” value inside same shipment
    "packageType" - You can use “PC” as default value
    “serviceCode” - depending on the service you use to deliver the parcel
    "pickupPointId" - you can use values from Parcel 1 that GLUE generated
    “routingServiceCode” - you can use values from Parcel 1 that GLUE generated
    additionalServices - if they are needed you can use values from Parcel 1 that GLUE generated

In this example parcelId:1 was generated by GLUE and now parcel 2 was added by user.

PUT {{glueApiUrl}}/ecommerce/v3/shipments/{{shipmentId}}
Example payload

{
  "status": {
    "value": "Delivered"
  },
  "consignment": {
    "parcels": [
      {
        "parcelId": "1",
        "packageType": "PC",
        "ready": true,
        "rows": [
          {
            "externalWarehouseId": "01093579",
            "itemId": "0109357-9-5002",
            "deliveredQuantity": 2,
            "quantity": 5.0
          }
        ]
      },
      {
        "parcelId": "2",
        "packageType": "PC",
        "serviceCode": "2103",
        "pickupPointId": "002303200",
        "routingServiceCode": "3200",
        "ready": true,
        "rows": [
          {
            "externalWarehouseId": "01093579",
            "itemId": "0109357-9-5002",
            "deliveredQuantity": 3,
            "quantity": 5.0
          }
        ]
      }
    ]
  }
}
    

Response

As seen from the response for both parcels tracking codes and address labels where created.
Confirming shipment with no changes (fast confirm)

GLUE provides option to confirm shipment with no changes. This means that all products and ordered quantities are supposed to be delivered.

This case supplier don't need to provide any data in message body when confirming the shipment.

Only call that is needed is:

POST {{glueApiUrl}}/ecommerce/v3/shipments/{{shipmentId}}/delivered

In this case shipment is marked as “Delivered”, address labels are created and deliveredQuantity=ordered quantity.

Response is similar to previous confirmation. Full shipment json with tracking information is returned.
Confirming shipment with partial delivery

If you cant deliver all ordered products then you still need to include them in confirmation message but deliveredQuantity value must be set to 0. This indicates to retailer that this product was not shipped.
Canceling shipment

For total cancellation you can just update shipment status to “Cancelled”.

PATCH {{glueApiUrl}}/ecommerce/v3/shipments/{{shipmentId}}
Example payload

{
  "status": {
    "value": "Cancelled",
  }
}

    

Tracking API

Track the events of your shipments

Tracking API provides you with tracking access to Posti shipment information. The API covers freight, parcel and signed letter shipments.

The API has two ways of using.

    Public way where you can search any Posti shipments by tracking code, however the response data is much more limited in this case. Refer to role "public" in model description for exact fields.
    Normal way where you can search only shipments that have been sent by you. The criteria that identifies this is the posti contract ID. With this interface we provide you more extensive information about the shipment. Refer to role "external" in model description for exact fields.

To get access to the API, please refer to OAuth setup and information. When asking for credentials to be created please inform whether you would like to get public, or normal access to the API.

Event code descriptions are available in a separate JSON document.

Note: API is subject to change. The structure will not change but eg. new fields can be added. Please take this to account in the implementation.

Skip to operations
Servers
shipments

Shipment tracking API
GET
/tracking/7/shipments/waybillnumber/{waybillNumber}
Provides information about a shipment defined by a waybill number
GET
/tracking/7/shipments/trackingnumbers/{trackingNumbers}
Provides information about shipments defined by tracking numbers
GET
/tracking/7/shipments/trackingnumber/{trackingNumber}
Provides information about a shipment defined by a tracking number.
GET
/tracking/7/shipments/senderreference/{reference}
Provides information about shipments defined by a sender reference
GET
/tracking/7/shipments/receiverreference/{reference}
Provides information about shipments defined by a receiver reference
GET
/tracking/7/shipments/phonenumber/{phoneNumber}
Provides information about shipments defined by sender or receiver phone number
GET
/tracking/7/shipments/ordernumber/{orderNumber}
Provides information about shipments defined by a order number
GET
/tracking/7/shipments/goodsitemid/{goodsItemId}
Provides information about a shipment defined by a goods item id
GET
/tracking/7/shipments/find
Provides information about shipments defined by a keyword.
GET
/tracking/7/shipments/find/{keyword}
Provides information about shipments defined by a keyword.
GET
/tracking/7/shipments/event/date
Provides information about shipments which have events within provided from/to dates.
GET
/tracking/7/shipments/errandcode/{errandCode}
Provides information about a shipment defined by an errand code
GET
/tracking/7/shipments/consignmentnumber/{consignmentNumber}
Provides information about a shipment defined by a consignment number
reservations

Reservations tracking API
GET
/tracking/7/reservations/status
Provides statistics about shipment resevations



Sending Code API

The Sending Code API lets you generate a short code that replaces a printed shipping label.

    The code is 6 characters long, using numbers (0–9) and letters (A–F).
    You can write this code directly on the parcel instead of attaching a label.

With this API you can:

    Create a new sending code for a shipment
    Retrieve a sending code if it already exists
    Look up shipment details by sending code

Authentication

Posti APIs are secured with authentication and authorization flows based on OAuth 2.0. The production credentials (client ID and secret) can be ordered from the LogEDI@posti.com. Required information in the credentials order: Posti contract number, Organization number (Business ID), contact information.
Requesting the token

    The request must be an HTTP POST request.
    The request must include a Content-Type header with the value of application/x-www-form-urlencoded.
    The body of the request must have:
    grant_type=client_credentials
    client_id=<User ID>
    client_secret=<User secret>

Production authentication token request URL:
https://gateway-auth.posti.fi/api/v1/token

Sample access token cURL request:

curl -X POST https://gateway-auth.posti.fi/api/v1/token \
--header "Content-Type: application/x-www-form-urlencoded" \
--data-urlencode "grant_type=client_credentials" \
--data-urlencode "client_id=<DEMO-USER-ID>" \
--data-urlencode "client_secret=<DEMO-SECRET-ID>"
            

Receiving the access token

If the client is successfully authenticated, an access token is returned. The content of the token_value is encrypted. The targets list the available APIs that are allowed to be used with the token.

{
  "access_token": "",
  "token_type": "Bearer",
  "expires_in": 3600,
  "posti_fi": {
    "targets": {
      "2025-04": {
        "url": "https://gateway.posti.fi/2025-04",
        "tier": 0
      }
    }
  }
}

            

Using the access token

To use the access token to authenticate API request, construct a normal HTTPS request and include an Authorization header with the value of Bearer <token_value>.

Sample Sending Code API cURL request:

curl -X POST https://gateway.posti.fi/2025-04/labelless \
--header "Content-Type: application/json" \
--header "Authorization: Bearer <token_value>" \
--data "{'searchCriteria': {'trackingNumber': 'JJFI65432100000000224'}}"
            

Access token expiration

Access tokens obtained from the token endpoint expire in one hour (3600 seconds).
Instructions

You can view the OpenAPI specification here.
General conventions

Pickup Point API is part of Posti APIs and follows a long-term version numbering, visible in the path in “yyyy-mm” format. Yearly releases will be published, and each version is supported for three years.
Environments

Currently only a production environment is available for customers.

Production Sending Code API endpoints

    Create a sending code for a shipment

    POST https://gateway.posti.fi/2025-04/labelless

    Retrieve sending code by tracking number

    GET https://gateway.posti.fi/2025-04/labelless/{trackingNumber}

    Get shipment details by sending code

    GET https://gateway.posti.fi/2025-04/labelless/shipment/{sendingCode}

Request format

    Provide the trackingNumber of the shipment you want a code for.
    (Optional) Add "validation": {"noEdiCheck": true} if you want to bypass the EDI check. Normally, the system ensures the shipment has EDI data before creating a code.

{
  "searchCriteria": {
    "trackingNumber": " JJFI65432100000000224"
  },
  "validation": {
    "noEdiCheck": true
  }
}
            

Response format

You’ll get a list of shipments with their sending codes.

Example:

{
  "shipments": [
    {
      "trackingNumber": " JJFI65432100000000224",
      "sendingCode": "654321"
    }
  ]
} 
            

Shipments V3 API

Manage your dropshipping shipments and generate parcel labels for them

This API is only used in dropshipping shipments see tutorial getting started with Drop Shipping for suppliers. Shipments API allows your to view your shipments generated from sales orders, add status information to shipments (and orders), register your shipments with Posti, retrieve tracking codes for them, and generate parcel labels for them. Typically you will first register your shipment, and receive a tracking code (or multiple tracking codes, in there is more than one parcel) as a response. From then on, you can use the received tracking code to keep track of your shipment's status during its handling, transportation and delivery.

If you act as a supplier for a separate retailer, you will first fetch the shipments generated from retailer's sales orders and then continue the process as described above. The status information you add to your shipments will also be linked to the original sales order, so the retailer will also be able to track the status of the shipments related to their orders.

As a final step, you would download the parcel label PDF from the provided URL, print it, attach it to your parcel, and hand it over to Posti for transportation. Then you would just wait for the parcel to be delivered, and use the tracking code to keep track of its status in the meanwhile.

As with other requests to the system, user must be authenticated as described in Posti Authentication API.
Skip to operations
Servers
shipments-controller
GET
/ecommerce/v3/shipments/{shipmentId}
PUT
/ecommerce/v3/shipments/{shipmentId}
PATCH
/ecommerce/v3/shipments/{shipmentId}
POST
/ecommerce/v3/shipments/{shipmentId}/events
POST
/ecommerce/v3/shipments/{shipmentId}/delivered
GET
/ecommerce/v3/shipments/{shipmentId}/parcels/{parcelId}/note
GET
/ecommerce/v3/shipments/{shipmentId}/parcels/{parcelId}/label
GET
/ecommerce/v3/shipments/{shipmentId}/options
GET
/ecommerce/v3/shipments
Schemas


Orders API V3

Submit and query orders

Orders API is used to place sales orders and purchase orders in the system and retrieve them. Orders can be routed to Posti’s warehouse system or external warehouse systems for picking and collecting.

As with other requests to the system, user must be authenticated as described in Posti Authentication API.

Older V2 documentation can be found here.
API Endpoints
Environment 	Protocol 	Host
Test 	HTTPS 	argon.ecom-api.posti.com
Prod 	HTTPS 	ecom-api.posti.com

API response codes can be found here.
Sequence of order flow with rows to one supplier
GlueOrderOneShipment
Sequence of order flow with rows to different suppliers
GlueOrderMultipleShipments
Retailer

In the most common case Retailer will:

    Create an order
    Poll order status and tracking information

Create an order

GLUE orders API V3 has field externalId as unique identifier for orders. This value must be unique within retailers orders in GLUE. If you place an order without externalId value GLUE auto generates a unique order id to the externalId field. This value is returned in response message for order creation and this value must be saved on customer side to get order status later.

Most common order to use in dropshipping case is SalesOrder (PurchaseOrder usage must be agreed separately with Posti and it’s applicable to eCom warehouse service).

externalId - Own order number from online shop. If not provided with order data GLUE generates externalId. This externalId must be stored then on retailers side because getting back order status and delivery information is done using this number. externalId must be unique per retailer and must contain only characters that are supported by barcode standard Code 128. This is needed because order number is added to delivery note as a barcode.

references - if you have a purchase order (PO) number for you supplier use it in the references with PO. See API model for implementation here.

vendor - Vendor is the Webshop (retailer) who is selling the goods to end customer. Vendor address data is displayed on the delivery note document. Note that externalId field of the vendor is used to map retailer to supplier’s account in integrations (currently valid for Also and Electrolux).

sender - Sender is the party who sends out the good to end customer. Note that sender address is also where undelivered shipments are returned. Sender information is printed on the parcel label. Sender information is taken from the settings of the Retailer/Warehouse Manager if the sender information is not provided with API call.

client - Person/Company (end-customer) who has bought the goods (end-customer). This is shown only on delivery note. If deliveryOperator is “Posti”, then email OR telephone (mobile phone) is mandatory. If deliveryOperator is Unifaun, then telephone (mobile phone) is mandatory.

deliveryAddress - Address where the parcel is sent. Pickup point address.

serviceCode - Service code for the delivery. Use Posti’s service codes if you are NOT using Unifaun to create documents and EDI for the delivery. In case of deliveries through Unifaun, Unifaun service codes must be used. When placing orders to “ALSO Finland Oy” following service codes are supported: 2102, 2103 and 2104. All other service codes will be defaulted to 2103 (Delivery to Posti outlet based on home address).

Note that serviceCode is a string value, so it must be between apostrophes when sending it in the request (e.g. "2103").

Supported service codes are listed at: https://api.posti.fi/resources/SupportedServiceCodes.pdf . Note that the list does not mention the 2W prefix front of the service code (e.g. "2W2103") but it is possible for those Retailer’s who are using v2 version of the Orders API.

deliveryOperator - Posti or Unifaun. Unifaun (now called as nShift) usage must be agreed separately and it also needs API keys to be added to catalog configuration.

pickupPointId - directs the shipment to the correct service point. Values are available at Location API in the pupCode field (see more at https://developer.posti.fi). Value is deliveryOperator specific. If deliveryOperator is not Posti then pupCode value from Location API can not be used.

rows.externalProductId / rows.productEANCode - You can use either externalProductId or productEANCode for placing the order. PS! If you provide both values and one of them is not correct (not matching the GLUE data for that product) order will be rejected.

Order must contain one order row per product. When you order same product on different order rows will cause mismatches in confirmed quantities.

Do not send order rows like this (same product is on two different rows):

{
  "rows": [
    {
      "externalId": "1",
      "externalProductId": "Example-product-01",
      "externalWarehouseId": "01093579",
      "quantity": 1
    },
    {
      "externalId": "2",
      "externalProductId": "Example-product-01",
      "externalWarehouseId": "01093579",
      "quantity": 1
    }
  ]
}
  

Instead send order like this:

{
  "rows": [
    {
      "externalId": "1",
      "externalProductId": "Example-product-01",
      "externalWarehouseId": "01093579",
      "quantity": 2
    }
  ]
}
  


Order body must be sent with POST command to endpoint: {{glueApiUrl}}/ecommerce/v3/orders
Example order body

Find full schema description here.

As a result of this order - parcel label and delivery note would look like this:

    Parcel label:

    GlueParcelLabelExample

    Delivery note:

    Glue has basic template for the delivery note. Retailer’s own logo and return instructions can be added to the delivery. Both of those shall be provided as a PNG image which is updated to the Glue by Posti’s service desk.
    GlueDeliveryNoteExample

Poll order status and tracking information

To get back order data from GLUE use GET {{glueApiUrl}}/v3/orders/{externalId}

externalId is the value that retailer sent with and order. If externalId value was not sent with the order then use value that GLUE returned (GLUE generated externalId value is in format: XXX-XXX-XXX).

Example response for GET order for previously generated order after supplier has processed it:
Example order body

Find full schema description here.

status - Displays the current status of the order. Delivered means that supplier has processed the order and goods have been sent out from suppliers warehouse. PS! This Delivered status is not indicating that end customer has received the goods.

Note that rows also contain statuses. When you place order that has products from different suppliers then you need to take into account the row statuses also because different suppliers might have different processing speeds and in that case one row gets delivered but other row might still be in picking or other status. In that case order general status is Partially delivered.

Order statuses can be found here.

Tracking codes are located in 2 different places. On the order level and also on the row level. If order was sent out in multiple parcels then this allows you to see what product is in what parcel. It is recommended to use order level to get tracking code for your own system.

If order was cancelled by supplier then order will have status Delivered and order rows will have status Delivered but deliveredQuantity=0 for order rows. If non of the ordered goods where not able to send out then all order rows have deliveredQuantity=0 . If some rows where sent out then they will have the delivered value. Also there is option that order has status Cancelled.
How to use parameters to GET orders

To improve getting order statuses and delivery information GET {{glueApiUrl}}/v3/orders supports a variation of parameters that can be used.

refName - value provided with order data in references object. Should be combined with parameter refValue.

refValue - value provided with order data in references object. Should be combined with parameter refName.

status - Returns only orders that have provided status. For example polling only orders that have final “Delivered” status. Could be combined with parameter updatedFrom.

documentType - In case of warehouse solution documentType can be used to filter out sales order or purchase orders.

warehouseExternalId - Since supplier is tied to a specific warehouse then for getting orders thet where placed to one specific supplier this parameter can be used.

from - can be used to get order by orderDate value. Supported timeformat is in zulu time. Example: 2021-09-07T13:01:22.282Z. Can be combined together with parameter to get orders that order date falls between provided timestamps.

to - can be used to get order by orderDate value. Supported timeformat is in zulu time. Example: 2021-09-07T13:01:22.282Z. Can be combined together with parameter from to get orders that order date falls between provided timestamps.

updatedFrom - returns orders that have been updated after provided timestamp. Can be used together with parameter status. By asking status=Delivered and providing timestamp you can poll orders that have marked Delivered after last request. Supported timeformat is in zulu time. Example: 2021-09-07T13:01:22.282Z.

updatedTo - returns orders that have been updated before provided timestamp. Can be used together with parameter status and updatedFrom to get Delivered orders between provided timestamps. Supported timeformat is in zulu time. Example: 2021-09-07T13:01:22.282Z.



Posti Locations API
Location Service API

NOTE! The Location Service API v1, v2, and v3 will be deprecated on 31.3.2026 and will stop working then.

Please use the new Pickup Point API for fetching the Posti pickup point data (developer.posti.com).



Sending Code API

The Sending Code API lets you generate a short code that replaces a printed shipping label.

    The code is 6 characters long, using numbers (0–9) and letters (A–F).
    You can write this code directly on the parcel instead of attaching a label.

With this API you can:

    Create a new sending code for a shipment
    Retrieve a sending code if it already exists
    Look up shipment details by sending code

Authentication

Posti APIs are secured with authentication and authorization flows based on OAuth 2.0. The production credentials (client ID and secret) can be ordered from the LogEDI@posti.com. Required information in the credentials order: Posti contract number, Organization number (Business ID), contact information.
Requesting the token

    The request must be an HTTP POST request.
    The request must include a Content-Type header with the value of application/x-www-form-urlencoded.
    The body of the request must have:
    grant_type=client_credentials
    client_id=<User ID>
    client_secret=<User secret>

Production authentication token request URL:
https://gateway-auth.posti.fi/api/v1/token

Sample access token cURL request:

curl -X POST https://gateway-auth.posti.fi/api/v1/token \
--header "Content-Type: application/x-www-form-urlencoded" \
--data-urlencode "grant_type=client_credentials" \
--data-urlencode "client_id=<DEMO-USER-ID>" \
--data-urlencode "client_secret=<DEMO-SECRET-ID>"
            

Receiving the access token

If the client is successfully authenticated, an access token is returned. The content of the token_value is encrypted. The targets list the available APIs that are allowed to be used with the token.

{
  "access_token": "",
  "token_type": "Bearer",
  "expires_in": 3600,
  "posti_fi": {
    "targets": {
      "2025-04": {
        "url": "https://gateway.posti.fi/2025-04",
        "tier": 0
      }
    }
  }
}

            

Using the access token

To use the access token to authenticate API request, construct a normal HTTPS request and include an Authorization header with the value of Bearer <token_value>.

Sample Sending Code API cURL request:

curl -X POST https://gateway.posti.fi/2025-04/labelless \
--header "Content-Type: application/json" \
--header "Authorization: Bearer <token_value>" \
--data "{'searchCriteria': {'trackingNumber': 'JJFI65432100000000224'}}"
            

Access token expiration

Access tokens obtained from the token endpoint expire in one hour (3600 seconds).
Instructions

You can view the OpenAPI specification here.
General conventions

Pickup Point API is part of Posti APIs and follows a long-term version numbering, visible in the path in “yyyy-mm” format. Yearly releases will be published, and each version is supported for three years.
Environments

Currently only a production environment is available for customers.

Production Sending Code API endpoints

    Create a sending code for a shipment

    POST https://gateway.posti.fi/2025-04/labelless

    Retrieve sending code by tracking number

    GET https://gateway.posti.fi/2025-04/labelless/{trackingNumber}

    Get shipment details by sending code

    GET https://gateway.posti.fi/2025-04/labelless/shipment/{sendingCode}

Request format

    Provide the trackingNumber of the shipment you want a code for.
    (Optional) Add "validation": {"noEdiCheck": true} if you want to bypass the EDI check. Normally, the system ensures the shipment has EDI data before creating a code.

{
  "searchCriteria": {
    "trackingNumber": " JJFI65432100000000224"
  },
  "validation": {
    "noEdiCheck": true
  }
}
            

Response format

You’ll get a list of shipments with their sending codes.

Example:

{
  "shipments": [
    {
      "trackingNumber": " JJFI65432100000000224",
      "sendingCode": "654321"
    }
  ]
} 
            

